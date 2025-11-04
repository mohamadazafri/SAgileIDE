from mongoengine import Document, EmbeddedDocument, fields
from datetime import datetime
import bson


class RepositoryFile(EmbeddedDocument):
    """
    Embedded document for repository files
    """
    FILE_TYPE_CHOICES = [
        ('code', 'Code File'),
        ('config', 'Configuration'),
        ('documentation', 'Documentation'),
        ('test', 'Test File'),
        ('asset', 'Asset'),
        ('other', 'Other'),
    ]
    
    file_path = fields.StringField(
        max_length=500,
        required=True,
        help_text="Relative path of the file in the repository"
    )
    
    file_name = fields.StringField(
        max_length=255,
        required=True,
        help_text="Name of the file"
    )
    
    file_type = fields.StringField(
        max_length=20,
        choices=FILE_TYPE_CHOICES,
        default='code',
        help_text="Type of file"
    )
    
    file_size = fields.LongField(
        null=True,
        help_text="File size in bytes"
    )
    
    # File content tracking
    last_modified = fields.DateTimeField(
        default=datetime.utcnow,
        help_text="Last time the file was modified"
    )
    
    last_modified_by = fields.ObjectIdField(
        null=True,
        help_text="User ID who last modified this file"
    )
    
    last_modified_by_username = fields.StringField(
        default='',
        help_text="Username of last modifier for easy reference"
    )
    
    # File content
    content = fields.StringField(
        default='',
        help_text="File content (for text files)"
    )
    
    # File metadata
    created_at = fields.DateTimeField(default=datetime.utcnow)
    
    def __str__(self):
        return f"{self.file_path}"
    
    @property
    def file_extension(self):
        """Get file extension"""
        return self.file_name.split('.')[-1] if '.' in self.file_name else ''
    
    def get_file_type_display(self):
        """Get formatted file type"""
        type_dict = dict(self.FILE_TYPE_CHOICES)
        return type_dict.get(self.file_type, self.file_type)


class Repository(Document):
    """
    Repository model for code repositories linked to SAgile projects
    """
    ACCESS_CHOICES = [
        ('private', 'Private'),
        ('public', 'Public'),
        ('internal', 'Internal'),
    ]
    
    PROJECT_TYPE_CHOICES = [
        ('fresh', 'Fresh Project'),
        ('upload', 'Upload Existing Files'),
        ('template', 'From Template'),
    ]
    
    # Repository identification
    name = fields.StringField(
        max_length=100,
        required=True,
        help_text="Repository name (lowercase, alphanumeric, hyphens only)"
    )
    
    description = fields.StringField(
        max_length=1000,
        default='',
        help_text="Repository description"
    )
    
    # Link to SAgile project
    project_id = fields.ObjectIdField(
        required=True,
        help_text="Linked SAgile project ID"
    )
    
    project_sagile_id = fields.StringField(
        required=True,
        help_text="SAgile project ID for easy reference"
    )
    
    # Repository configuration
    access_level = fields.StringField(
        max_length=10,
        choices=ACCESS_CHOICES,
        default='private',
        help_text="Repository access level"
    )
    
    project_type = fields.StringField(
        max_length=10,
        choices=PROJECT_TYPE_CHOICES,
        default='fresh',
        help_text="How the project was initialized"
    )
    
    # Repository metadata
    created_by = fields.ObjectIdField(
        null=True,
        help_text="User ID who created this repository"
    )
    
    created_by_username = fields.StringField(
        default='',
        help_text="Username of creator for easy reference"
    )
    
    # File system information
    root_path = fields.StringField(
        max_length=500,
        default='',
        help_text="Root path of the repository in the file system"
    )
    
    # Repository status
    is_initialized = fields.BooleanField(
        default=False,
        help_text="Whether the repository has been initialized with files"
    )
    
    # Files in the repository
    files = fields.ListField(
        fields.EmbeddedDocumentField(RepositoryFile),
        default=list,
        help_text="Files in the repository"
    )
    
    # Metadata
    created_at = fields.DateTimeField(default=datetime.utcnow)
    updated_at = fields.DateTimeField(default=datetime.utcnow)
    
    meta = {
        'collection': 'repositories',
        'indexes': [
            'name',
            'project_id',
            'project_sagile_id',
            'created_by',
            ('name', 'created_by'),
            ('project_id', 'name')
        ]
    }
    
    def __str__(self):
        return f"{self.name} ({self.project_sagile_id})"
    
    @property
    def full_name(self):
        """Get full repository name with project context"""
        return f"{self.project_sagile_id}/{self.name}"
    
    def get_access_display(self):
        """Get formatted access level"""
        access_dict = dict(self.ACCESS_CHOICES)
        return access_dict.get(self.access_level, self.access_level)
    
    def get_project_type_display(self):
        """Get formatted project type"""
        type_dict = dict(self.PROJECT_TYPE_CHOICES)
        return type_dict.get(self.project_type, self.project_type)
    
    def add_file(self, file_path, file_name, file_type='code', file_size=None, modified_by=None, modified_by_username=''):
        """Add a file to the repository"""
        # Check if file already exists
        for file in self.files:
            if file.file_path == file_path:
                # Update existing file
                file.file_name = file_name
                file.file_type = file_type
                file.file_size = file_size
                file.last_modified = datetime.utcnow()
                file.last_modified_by = modified_by
                file.last_modified_by_username = modified_by_username
                break
        else:
            # Add new file
            new_file = RepositoryFile(
                file_path=file_path,
                file_name=file_name,
                file_type=file_type,
                file_size=file_size,
                last_modified_by=modified_by,
                last_modified_by_username=modified_by_username
            )
            self.files.append(new_file)
        
        self.updated_at = datetime.utcnow()
        self.save()
    
    def remove_file(self, file_path):
        """Remove a file from the repository"""
        self.files = [f for f in self.files if f.file_path != file_path]
        self.updated_at = datetime.utcnow()
        self.save()
    
    def get_file_by_path(self, file_path):
        """Get a file by its path"""
        for file in self.files:
            if file.file_path == file_path:
                return file
        return None
    
    def get_files_by_type(self, file_type):
        """Get all files of a specific type"""
        return [f for f in self.files if f.file_type == file_type]
    
    @property
    def file_count(self):
        """Get total number of files"""
        return len(self.files)
    
    def get_repository_status(self):
        """Get repository status based on initialization and file count"""
        if not self.is_initialized:
            return 'Not Initialized'
        elif self.file_count == 0:
            return 'Empty'
        else:
            return f'{self.file_count} files'
    
    def save(self, *args, **kwargs):
        """Override save to update timestamp"""
        self.updated_at = datetime.utcnow()
        super().save(*args, **kwargs)