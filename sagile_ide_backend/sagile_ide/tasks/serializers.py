from rest_framework import serializers
from bson import ObjectId
from .models import Task, CodeLink, TaskComment
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


class CodeLinkSerializer(serializers.ModelSerializer):
    """Serializer for code links"""
    created_by = ObjectIdField(read_only=True)
    created_by_username = serializers.CharField(read_only=True)
    line_range = serializers.ReadOnlyField()
    code_preview = serializers.ReadOnlyField()
    
    class Meta:
        model = CodeLink
        fields = [
            'file_path', 'file_name', 'selected_text', 'start_line', 'end_line',
            'start_column', 'end_column', 'line_range', 'code_preview',
            'created_by', 'created_by_username', 'created_at'
        ]
        read_only_fields = ['created_at']


class TaskCommentSerializer(serializers.ModelSerializer):
    """Serializer for task comments"""
    author_id = ObjectIdField(read_only=True)
    author_username = serializers.CharField(read_only=True)
    is_recent = serializers.ReadOnlyField()
    
    class Meta:
        model = TaskComment
        fields = [
            'author_id', 'author_username', 'content', 'is_progress_update',
            'old_progress', 'new_progress', 'is_recent', 'created_at'
        ]
        read_only_fields = ['created_at']


class TaskSerializer(serializers.ModelSerializer):
    """Serializer for Task model"""
    id = ObjectIdField(read_only=True)
    project_id = ObjectIdField(read_only=True)
    project_sagile_id = serializers.CharField(read_only=True)
    assignee_id = ObjectIdField(read_only=True)
    assignee_username = serializers.CharField(read_only=True)
    created_by_id = ObjectIdField(read_only=True)
    created_by_username = serializers.CharField(read_only=True)
    code_links = CodeLinkSerializer(many=True, read_only=True)
    comments = TaskCommentSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    has_code_links = serializers.ReadOnlyField()
    code_link_count = serializers.ReadOnlyField()
    last_updated_display = serializers.CharField(source='get_last_updated_display', read_only=True)
    
    class Meta:
        model = Task
        fields = [
            'id', 'task_id', 'title', 'description', 'project_id', 'project_sagile_id',
            'assignee_id', 'assignee_username', 'status', 'status_display', 'priority', 'priority_display',
            'progress', 'estimated_hours', 'actual_hours', 'due_date', 'started_at', 'completed_at',
            'code_links', 'comments', 'has_code_links', 'code_link_count', 'last_updated_display',
            'created_by_id', 'created_by_username', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class TaskCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating tasks"""
    id = ObjectIdField(read_only=True)
    project_id = ObjectIdField()
    assignee_id = ObjectIdField(required=False, allow_null=True)
    
    class Meta:
        model = Task
        fields = [
            'id', 'task_id', 'title', 'description', 'project_id', 'assignee_id',
            'status', 'priority', 'estimated_hours', 'due_date'
        ]
    
    def validate_task_id(self, value):
        """Validate task ID format and uniqueness"""
        if not value:
            raise serializers.ValidationError("Task ID is required")
        
        if Task.objects(task_id=value).count() > 0:
            raise serializers.ValidationError("Task ID already exists")
        
        return value
    
    def validate_project_id(self, value):
        """Validate that project exists"""
        try:
            Project.objects.get(id=value)
        except Project.DoesNotExist:
            raise serializers.ValidationError("Project does not exist")
        return value
    
    def validate_assignee_id(self, value):
        """Validate that assignee exists"""
        if value:
            try:
                User.objects.get(id=value)
            except User.DoesNotExist:
                raise serializers.ValidationError("Assignee does not exist")
        return value
    
    def create(self, validated_data):
        project_id = validated_data.pop('project_id')
        assignee_id = validated_data.pop('assignee_id', None)
        
        project = Project.objects.get(id=project_id)
        assignee = User.objects.get(id=assignee_id) if assignee_id else None
        
        task = Task(
            project_id=project_id,
            project_sagile_id=project.sagile_id,
            assignee_id=assignee_id,
            assignee_username=assignee.username if assignee else '',
            **validated_data
        )
        task.save()
        
        return task


class TaskUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating tasks"""
    id = ObjectIdField(read_only=True)
    assignee_id = ObjectIdField(required=False, allow_null=True)
    
    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'assignee_id', 'status', 'priority',
            'progress', 'estimated_hours', 'actual_hours', 'due_date'
        ]
    
    def validate_assignee_id(self, value):
        """Validate that assignee exists"""
        if value:
            try:
                User.objects.get(id=value)
            except User.DoesNotExist:
                raise serializers.ValidationError("Assignee does not exist")
        return value
    
    def update(self, instance, validated_data):
        assignee_id = validated_data.get('assignee_id')
        if assignee_id:
            assignee = User.objects.get(id=assignee_id)
            validated_data['assignee_username'] = assignee.username
        elif assignee_id is None:  # Explicitly set to None
            validated_data['assignee_username'] = ''
        
        return super().update(instance, validated_data)


class TaskListSerializer(serializers.ModelSerializer):
    """Simplified serializer for task lists"""
    id = ObjectIdField(read_only=True)
    project_sagile_id = serializers.CharField(read_only=True)
    assignee_username = serializers.CharField(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    has_code_links = serializers.ReadOnlyField()
    code_link_count = serializers.ReadOnlyField()
    last_updated_display = serializers.CharField(source='get_last_updated_display', read_only=True)
    
    class Meta:
        model = Task
        fields = [
            'id', 'task_id', 'title', 'project_sagile_id', 'assignee_username',
            'status', 'status_display', 'priority', 'priority_display', 'progress',
            'has_code_links', 'code_link_count', 'last_updated_display', 'created_at'
        ]


class AddCodeLinkSerializer(serializers.Serializer):
    """Serializer for adding code links to tasks"""
    file_path = serializers.CharField(max_length=500)
    file_name = serializers.CharField(max_length=255)
    selected_text = serializers.CharField()
    start_line = serializers.IntegerField(min_value=1)
    end_line = serializers.IntegerField(min_value=1)
    start_column = serializers.IntegerField(required=False, allow_null=True, min_value=0)
    end_column = serializers.IntegerField(required=False, allow_null=True, min_value=0)
    
    def validate(self, attrs):
        if attrs['start_line'] > attrs['end_line']:
            raise serializers.ValidationError("Start line must be less than or equal to end line")
        
        if attrs.get('start_column') is not None and attrs.get('end_column') is not None:
            if attrs['start_column'] > attrs['end_column']:
                raise serializers.ValidationError("Start column must be less than or equal to end column")
        
        return attrs


class AddTaskCommentSerializer(serializers.Serializer):
    """Serializer for adding comments to tasks"""
    content = serializers.CharField(max_length=2000)
    is_progress_update = serializers.BooleanField(default=False)
    old_progress = serializers.IntegerField(required=False, allow_null=True, min_value=0, max_value=100)
    new_progress = serializers.IntegerField(required=False, allow_null=True, min_value=0, max_value=100)
    
    def validate(self, attrs):
        if attrs.get('is_progress_update'):
            if attrs.get('old_progress') is None or attrs.get('new_progress') is None:
                raise serializers.ValidationError("Progress update requires both old_progress and new_progress")
        return attrs


class UpdateTaskProgressSerializer(serializers.Serializer):
    """Serializer for updating task progress"""
    progress = serializers.IntegerField(min_value=0, max_value=100)
    comment = serializers.CharField(required=False, allow_blank=True, max_length=1000)
