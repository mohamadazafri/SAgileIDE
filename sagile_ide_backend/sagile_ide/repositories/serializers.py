from rest_framework import serializers
from bson import ObjectId
from .models import Repository, RepositoryFile
from projects.models import Project
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


class RepositoryFileSerializer(serializers.ModelSerializer):
    """Serializer for repository files"""
    file_extension = serializers.ReadOnlyField()
    file_type_display = serializers.CharField(source='get_file_type_display', read_only=True)
    last_modified_by = ObjectIdField(read_only=True)
    last_modified_by_username = serializers.CharField(read_only=True)
    
    class Meta:
        model = RepositoryFile
        fields = [
            'file_path', 'file_name', 'file_type', 'file_type_display',
            'file_size', 'file_extension', 'last_modified', 
            'last_modified_by', 'last_modified_by_username', 'created_at'
        ]
        read_only_fields = ['created_at']


class RepositorySerializer(serializers.ModelSerializer):
    """Serializer for Repository model"""
    id = ObjectIdField(read_only=True)
    project_id = ObjectIdField(read_only=True)
    project_sagile_id = serializers.CharField(read_only=True)
    created_by = ObjectIdField(read_only=True)
    created_by_username = serializers.CharField(read_only=True)
    files = RepositoryFileSerializer(many=True, read_only=True)
    full_name = serializers.ReadOnlyField()
    access_display = serializers.CharField(source='get_access_display', read_only=True)
    project_type_display = serializers.CharField(source='get_project_type_display', read_only=True)
    file_count = serializers.ReadOnlyField()
    
    class Meta:
        model = Repository
        fields = [
            'id', 'name', 'description', 'project_id', 'project_sagile_id',
            'access_level', 'access_display', 'project_type', 'project_type_display',
            'created_by', 'created_by_username', 'root_path', 'is_initialized',
            'files', 'file_count', 'full_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class RepositoryCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating repositories"""
    id = ObjectIdField(read_only=True)
    project_id = ObjectIdField()
    
    class Meta:
        model = Repository
        fields = [
            'id', 'name', 'description', 'project_id', 'access_level', 'project_type'
        ]
    
    def validate_name(self, value):
        """Validate repository name format"""
        import re
        if not re.match(r'^[a-z0-9-]+$', value):
            raise serializers.ValidationError(
                "Repository name can only contain lowercase letters, numbers, and hyphens"
            )
        if len(value) < 3:
            raise serializers.ValidationError("Repository name must be at least 3 characters")
        return value
    
    def validate_project_id(self, value):
        """Validate that project exists and doesn't already have a repository"""
        try:
            project = Project.objects.get(id=value)
            if project.has_repository:
                raise serializers.ValidationError("Project already has a repository")
        except Project.DoesNotExist:
            raise serializers.ValidationError("Project does not exist")
        return value
    
    def create(self, validated_data):
        project_id = validated_data.pop('project_id')
        project = Project.objects.get(id=project_id)
        
        # Create repository
        repository = Repository(
            project_id=project_id,
            project_sagile_id=project.sagile_id,
            **validated_data
        )
        repository.save()
        
        # Update project to mark it as having a repository
        project.has_repository = True
        project.save()
        
        return repository


class RepositoryUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating repositories"""
    id = ObjectIdField(read_only=True)
    
    class Meta:
        model = Repository
        fields = [
            'id', 'description', 'access_level', 'root_path', 'is_initialized'
        ]


class RepositoryListSerializer(serializers.ModelSerializer):
    """Simplified serializer for repository lists"""
    id = ObjectIdField(read_only=True)
    project_sagile_id = serializers.CharField(read_only=True)
    full_name = serializers.ReadOnlyField()
    file_count = serializers.ReadOnlyField()
    
    class Meta:
        model = Repository
        fields = [
            'id', 'name', 'project_sagile_id', 'access_level', 
            'project_type', 'full_name', 'file_count', 'is_initialized', 'created_at'
        ]


class AddRepositoryFileSerializer(serializers.Serializer):
    """Serializer for adding files to repository"""
    file_path = serializers.CharField(max_length=500)
    file_name = serializers.CharField(max_length=255)
    file_type = serializers.ChoiceField(choices=RepositoryFile.FILE_TYPE_CHOICES, default='code')
    file_size = serializers.IntegerField(required=False, allow_null=True)
    
    def validate_file_path(self, value):
        """Validate file path format"""
        if not value or value.startswith('/'):
            raise serializers.ValidationError("File path must be relative and not start with /")
        return value
