from mongoengine import Document, EmbeddedDocument, fields
from datetime import datetime
import bson


class CodeLink(EmbeddedDocument):
    """
    Embedded document for code links
    """
    # Code location information
    file_path = fields.StringField(
        max_length=500,
        required=True,
        help_text="Path to the file containing the code"
    )
    
    file_name = fields.StringField(
        max_length=255,
        required=True,
        help_text="Name of the file"
    )
    
    # Code selection details
    selected_text = fields.StringField(
        required=True,
        help_text="The actual code text that was selected"
    )
    
    start_line = fields.IntField(
        required=True,
        help_text="Starting line number of the selection"
    )
    
    end_line = fields.IntField(
        required=True,
        help_text="Ending line number of the selection"
    )
    
    start_column = fields.IntField(
        null=True,
        help_text="Starting column position"
    )
    
    end_column = fields.IntField(
        null=True,
        help_text="Ending column position"
    )
    
    # Link metadata
    created_by = fields.ObjectIdField(
        null=True,
        help_text="User ID who created this code link"
    )
    
    created_by_username = fields.StringField(
        default='',
        help_text="Username of creator for easy reference"
    )
    
    created_at = fields.DateTimeField(default=datetime.utcnow)
    
    def __str__(self):
        return f"{self.file_name}:{self.start_line}-{self.end_line}"
    
    @property
    def line_range(self):
        """Get formatted line range"""
        if self.start_line == self.end_line:
            return f"Line {self.start_line}"
        return f"Lines {self.start_line}-{self.end_line}"
    
    @property
    def code_preview(self):
        """Get a preview of the linked code"""
        lines = self.selected_text.split('\n')
        if len(lines) <= 3:
            return self.selected_text
        return '\n'.join(lines[:3]) + '\n...'


class TaskComment(EmbeddedDocument):
    """
    Embedded document for task comments
    """
    author_id = fields.ObjectIdField(
        required=True,
        help_text="User ID who wrote this comment"
    )
    
    author_username = fields.StringField(
        required=True,
        help_text="Username of author for easy reference"
    )
    
    content = fields.StringField(
        required=True,
        help_text="Comment content"
    )
    
    # Comment type
    is_progress_update = fields.BooleanField(
        default=False,
        help_text="Whether this is a progress update comment"
    )
    
    old_progress = fields.IntField(
        null=True,
        help_text="Previous progress value (for progress updates)"
    )
    
    new_progress = fields.IntField(
        null=True,
        help_text="New progress value (for progress updates)"
    )
    
    created_at = fields.DateTimeField(default=datetime.utcnow)
    
    def __str__(self):
        return f"Comment by {self.author_username}"
    
    @property
    def is_recent(self):
        """Check if comment is recent (within last 24 hours)"""
        from datetime import timedelta
        return self.created_at > datetime.utcnow() - timedelta(hours=24)


class Task(Document):
    """
    Task model for SAgile project tasks
    """
    STATUS_CHOICES = [
        ('todo', 'To Do'),
        ('in-progress', 'In Progress'),
        ('code-review', 'Code Review'),
        ('testing', 'Testing'),
        ('done', 'Done'),
        ('blocked', 'Blocked'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    
    # Task identification
    task_id = fields.StringField(
        max_length=20,
        unique=True,
        required=True,
        help_text="Unique task identifier (e.g., PROJ-123)"
    )
    
    title = fields.StringField(
        max_length=200,
        required=True,
        help_text="Task title"
    )
    
    description = fields.StringField(
        max_length=2000,
        required=True,
        help_text="Detailed task description"
    )
    
    # Task relationship
    project_id = fields.ObjectIdField(
        required=True,
        help_text="Project ID this task belongs to"
    )
    
    project_sagile_id = fields.StringField(
        required=True,
        help_text="SAgile project ID for easy reference"
    )
    
    # Task assignment
    assignee_id = fields.ObjectIdField(
        null=True,
        help_text="User ID assigned to this task"
    )
    
    assignee_username = fields.StringField(
        default='',
        help_text="Username of assignee for easy reference"
    )
    
    # Task status and priority
    status = fields.StringField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='todo',
        help_text="Current task status"
    )
    
    priority = fields.StringField(
        max_length=10,
        choices=PRIORITY_CHOICES,
        default='medium',
        help_text="Task priority level"
    )
    
    # Progress tracking
    progress = fields.IntField(
        default=0,
        min_value=0,
        max_value=100,
        help_text="Task completion percentage (0-100)"
    )
    
    # Time tracking
    estimated_hours = fields.FloatField(
        null=True,
        help_text="Estimated hours to complete"
    )
    
    actual_hours = fields.FloatField(
        default=0.0,
        help_text="Actual hours spent"
    )
    
    # Task dates
    due_date = fields.DateTimeField(
        null=True,
        help_text="Task due date"
    )
    
    started_at = fields.DateTimeField(
        null=True,
        help_text="When the task was started"
    )
    
    completed_at = fields.DateTimeField(
        null=True,
        help_text="When the task was completed"
    )
    
    # Code links
    code_links = fields.ListField(
        fields.EmbeddedDocumentField(CodeLink),
        default=list,
        help_text="Code linked to this task"
    )
    
    # Comments
    comments = fields.ListField(
        fields.EmbeddedDocumentField(TaskComment),
        default=list,
        help_text="Task comments and updates"
    )
    
    # Task metadata
    created_by_id = fields.ObjectIdField(
        null=True,
        help_text="User ID who created this task"
    )
    
    created_by_username = fields.StringField(
        default='',
        help_text="Username of creator for easy reference"
    )
    
    created_at = fields.DateTimeField(default=datetime.utcnow)
    updated_at = fields.DateTimeField(default=datetime.utcnow)
    
    meta = {
        'collection': 'tasks',
        'indexes': [
            'task_id',
            'project_id',
            'project_sagile_id',
            'assignee_id',
            'status',
            'priority',
            'created_by_id',
            ('project_id', 'status'),
            ('assignee_id', 'status'),
            ('task_id', 'project_sagile_id')
        ]
    }
    
    def __str__(self):
        return f"{self.task_id} - {self.title}"
    
    def get_status_display(self):
        """Get formatted status"""
        status_dict = dict(self.STATUS_CHOICES)
        return status_dict.get(self.status, self.status)
    
    def get_priority_display(self):
        """Get formatted priority"""
        priority_dict = dict(self.PRIORITY_CHOICES)
        return priority_dict.get(self.priority, self.priority)
    
    @property
    def has_code_links(self):
        """Check if task has linked code"""
        return len(self.code_links) > 0
    
    @property
    def code_link_count(self):
        """Get number of code links"""
        return len(self.code_links)
    
    def get_last_updated_display(self):
        """Get human-readable last updated time"""
        from datetime import timedelta
        now = datetime.utcnow()
        diff = now - self.updated_at
        
        if diff.days > 0:
            return f"{diff.days} day{'s' if diff.days != 1 else ''} ago"
        elif diff.seconds > 3600:
            hours = diff.seconds // 3600
            return f"{hours} hour{'s' if hours != 1 else ''} ago"
        elif diff.seconds > 60:
            minutes = diff.seconds // 60
            return f"{minutes} minute{'s' if minutes != 1 else ''} ago"
        else:
            return "Just now"
    
    def can_be_started_by(self, user_id):
        """Check if user can start this task"""
        return (self.status == 'todo' and 
                (self.assignee_id == user_id or self.is_manager(user_id)))
    
    def can_be_updated_by(self, user_id):
        """Check if user can update this task"""
        return (self.assignee_id == user_id or 
                self.is_manager(user_id) or 
                self.is_scrum_master(user_id))
    
    def is_manager(self, user_id):
        """Check if user is a project manager"""
        # This would need to check the user's role in the project
        # For now, we'll implement a simple check
        return False  # TODO: Implement proper role checking
    
    def is_scrum_master(self, user_id):
        """Check if user is a scrum master"""
        # This would need to check the user's role in the project
        # For now, we'll implement a simple check
        return False  # TODO: Implement proper role checking
    
    def add_code_link(self, file_path, file_name, selected_text, start_line, end_line, 
                     start_column=None, end_column=None, created_by=None, created_by_username=''):
        """Add a code link to this task"""
        code_link = CodeLink(
            file_path=file_path,
            file_name=file_name,
            selected_text=selected_text,
            start_line=start_line,
            end_line=end_line,
            start_column=start_column,
            end_column=end_column,
            created_by=created_by,
            created_by_username=created_by_username
        )
        self.code_links.append(code_link)
        self.updated_at = datetime.utcnow()
        self.save()
    
    def add_comment(self, author_id, author_username, content, is_progress_update=False, 
                   old_progress=None, new_progress=None):
        """Add a comment to this task"""
        comment = TaskComment(
            author_id=author_id,
            author_username=author_username,
            content=content,
            is_progress_update=is_progress_update,
            old_progress=old_progress,
            new_progress=new_progress
        )
        self.comments.append(comment)
        self.updated_at = datetime.utcnow()
        self.save()
    
    def update_progress(self, new_progress, updated_by=None, updated_by_username=''):
        """Update task progress with comment"""
        old_progress = self.progress
        self.progress = new_progress
        
        # Add progress update comment
        if updated_by:
            self.add_comment(
                author_id=updated_by,
                author_username=updated_by_username,
                content=f"Progress updated from {old_progress}% to {new_progress}%",
                is_progress_update=True,
                old_progress=old_progress,
                new_progress=new_progress
            )
        
        # Update status based on progress
        if new_progress == 100 and self.status != 'done':
            self.status = 'done'
            self.completed_at = datetime.utcnow()
        elif new_progress > 0 and self.status == 'todo':
            self.status = 'in-progress'
            if not self.started_at:
                self.started_at = datetime.utcnow()
        
        self.updated_at = datetime.utcnow()
        self.save()
    
    def save(self, *args, **kwargs):
        """Override save to update timestamp"""
        self.updated_at = datetime.utcnow()
        super().save(*args, **kwargs)