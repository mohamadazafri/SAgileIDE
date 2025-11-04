from rest_framework import serializers
from bson import ObjectId
from .models import Project, ProjectMembership
from users.models import User


class ObjectIdField(serializers.Field):
    """Custom field for handling MongoDB ObjectId"""
    
    def to_representation(self, value):
        return str(value) if value else None
    
    def to_internal_value(self, data):
        if isinstance(data, ObjectId):
            return data
        try:
            return ObjectId(data)
        except:
            raise serializers.ValidationError("Invalid ObjectId format")


class ProjectMembershipSerializer(serializers.ModelSerializer):
    """Serializer for project membership"""
    user_id = ObjectIdField()
    user_username = serializers.CharField(read_only=True)
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    
    class Meta:
        model = ProjectMembership
        fields = [
            'user_id', 'user_username', 'role', 'role_display', 
            'joined_at', 'is_active'
        ]
        read_only_fields = ['user_username', 'joined_at']


class ProjectSerializer(serializers.ModelSerializer):
    """Serializer for Project model"""
    id = ObjectIdField(read_only=True)
    created_by = ObjectIdField(read_only=True)
    created_by_username = serializers.CharField(read_only=True)
    members = ProjectMembershipSerializer(source='members', many=True, read_only=True)
    member_count = serializers.ReadOnlyField()
    member_count_display = serializers.ReadOnlyField()
    repository_status = serializers.SerializerMethodField()
    
    class Meta:
        model = Project
        fields = [
            'id', 'sagile_id', 'name', 'description', 'status',
            'start_date', 'end_date', 'current_sprint', 'has_repository',
            'member_count', 'member_count_display', 'repository_status',
            'created_by', 'created_by_username', 'members', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'has_repository']
    
    def get_repository_status(self, obj):
        return obj.get_repository_status()
    
    def validate_sagile_id(self, value):
        """Validate SAgile ID format"""
        if not value.startswith('PROJ-'):
            raise serializers.ValidationError("SAgile ID must start with 'PROJ-'")
        
        # Check if SAgile ID already exists (excluding current instance)
        instance = getattr(self, 'instance', None)
        if instance:
            existing = Project.objects(sagile_id=value).exclude(id=instance.id).count()
        else:
            existing = Project.objects(sagile_id=value).count()
        
        if existing > 0:
            raise serializers.ValidationError("SAgile ID already exists")
        
        return value


class ProjectCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new projects"""
    id = ObjectIdField(read_only=True)
    member_ids = serializers.ListField(
        child=ObjectIdField(),
        write_only=True,
        required=False,
        help_text="List of user IDs to add as members"
    )
    
    class Meta:
        model = Project
        fields = [
            'id', 'sagile_id', 'name', 'description', 'status',
            'start_date', 'end_date', 'current_sprint', 'member_ids'
        ]
    
    def validate_sagile_id(self, value):
        """Validate SAgile ID format"""
        if not value.startswith('PROJ-'):
            raise serializers.ValidationError("SAgile ID must start with 'PROJ-'")
        
        if Project.objects(sagile_id=value).count() > 0:
            raise serializers.ValidationError("SAgile ID already exists")
        
        return value
    
    def validate_member_ids(self, value):
        """Validate that all member IDs exist"""
        if value:
            existing_users = User.objects(id__in=value).count()
            if existing_users != len(value):
                raise serializers.ValidationError("One or more user IDs do not exist")
        return value
    
    def create(self, validated_data):
        member_ids = validated_data.pop('member_ids', [])
        project = Project(**validated_data)
        project.save()
        
        # Add members if provided
        for user_id in member_ids:
            try:
                user = User.objects.get(id=user_id)
                project.add_member(user_id, user.username, user.role)
            except User.DoesNotExist:
                continue
        
        return project


class ProjectUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating projects"""
    id = ObjectIdField(read_only=True)
    
    class Meta:
        model = Project
        fields = [
            'id', 'name', 'description', 'status', 'start_date', 
            'end_date', 'current_sprint'
        ]


class ProjectListSerializer(serializers.ModelSerializer):
    """Simplified serializer for project lists"""
    id = ObjectIdField(read_only=True)
    member_count_display = serializers.ReadOnlyField()
    repository_status = serializers.SerializerMethodField()
    
    class Meta:
        model = Project
        fields = [
            'id', 'sagile_id', 'name', 'status', 'current_sprint',
            'member_count_display', 'repository_status', 'created_at'
        ]
    
    def get_repository_status(self, obj):
        return obj.get_repository_status()


class AddProjectMemberSerializer(serializers.Serializer):
    """Serializer for adding project members"""
    user_id = ObjectIdField()
    role = serializers.ChoiceField(choices=ProjectMembership.ROLE_CHOICES, default='developer')
    
    def validate_user_id(self, value):
        """Validate that user exists"""
        try:
            User.objects.get(id=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("User does not exist")
        return value