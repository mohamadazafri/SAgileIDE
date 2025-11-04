from mongoengine import Document, EmbeddedDocument, fields
from datetime import datetime
import bson


class ProjectMembership(EmbeddedDocument):
    """
    Embedded document for project membership
    """
    ROLE_CHOICES = [
        ('scrum-master', 'Scrum Master'),
        ('developer', 'Developer'),
        ('project-manager', 'Project Manager'),
        ('tester', 'Tester'),
        ('product-owner', 'Product Owner'),
    ]
    
    user_id = fields.ObjectIdField(required=True)
    user_username = fields.StringField(required=True)  # For easy reference
    role = fields.StringField(
        max_length=20,
        choices=ROLE_CHOICES,
        required=True,
        help_text="User's role in this specific project"
    )
    
    joined_at = fields.DateTimeField(default=datetime.utcnow)
    is_active = fields.BooleanField(default=True)
    
    def __str__(self):
        return f"{self.user_username} as {self.get_role_display()}"
    
    def get_role_display(self):
        """Get human-readable role name"""
        role_dict = dict(self.ROLE_CHOICES)
        return role_dict.get(self.role, self.role)


class Project(Document):
    """
    SAgile Project model representing a project in the SAgile system
    """
    STATUS_CHOICES = [
        ('planning', 'Planning'),
        ('active', 'Active'),
        ('on-hold', 'On Hold'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    # SAgile Project ID (e.g., PROJ-2025-001)
    sagile_id = fields.StringField(
        max_length=20,
        unique=True,
        required=True,
        help_text="Unique SAgile project identifier"
    )
    
    name = fields.StringField(
        max_length=200,
        required=True,
        help_text="Project name"
    )
    
    description = fields.StringField(
        max_length=2000,
        default='',
        help_text="Project description"
    )
    
    status = fields.StringField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='planning',
        help_text="Current project status"
    )
    
    # Project team - using embedded documents
    members = fields.ListField(
        fields.EmbeddedDocumentField(ProjectMembership),
        default=list,
        help_text="Project team members"
    )
    
    # Project timeline
    start_date = fields.DateTimeField(
        null=True,
        help_text="Project start date"
    )
    
    end_date = fields.DateTimeField(
        null=True,
        help_text="Project end date"
    )
    
    # Current sprint information
    current_sprint = fields.StringField(
        max_length=50,
        default='',
        help_text="Current sprint (e.g., 'Sprint 3 (Week 2)')"
    )
    
    # Repository information
    has_repository = fields.BooleanField(
        default=False,
        help_text="Whether this project has a linked repository"
    )
    
    # Metadata
    created_by = fields.ObjectIdField(
        null=True,
        help_text="User ID who created this project"
    )
    
    created_by_username = fields.StringField(
        default='',
        help_text="Username of creator for easy reference"
    )
    
    created_at = fields.DateTimeField(default=datetime.utcnow)
    updated_at = fields.DateTimeField(default=datetime.utcnow)
    
    meta = {
        'collection': 'projects',
        'indexes': [
            'sagile_id',
            'name',
            'status',
            'created_by',
            'members.user_id',
            ('sagile_id', 'name')
        ]
    }
    
    def __str__(self):
        return f"{self.sagile_id} - {self.name}"
    
    @property
    def member_count(self):
        """Get the number of active team members"""
        return len([m for m in self.members if m.is_active])
    
    @property
    def member_count_display(self):
        """Get formatted member count string"""
        count = self.member_count
        return f"{count} member{'s' if count != 1 else ''}"
    
    def get_repository_status(self):
        """Get repository status display"""
        return "Repository exists" if self.has_repository else "No repository created"
    
    def add_member(self, user_id, username, role='developer'):
        """Add a member to the project"""
        # Check if user is already a member
        for member in self.members:
            if member.user_id == user_id:
                member.is_active = True
                member.role = role
                break
        else:
            # Add new member
            membership = ProjectMembership(
                user_id=user_id,
                user_username=username,
                role=role
            )
            self.members.append(membership)
        
        self.updated_at = datetime.utcnow()
        self.save()
    
    def remove_member(self, user_id):
        """Remove a member from the project (soft delete)"""
        for member in self.members:
            if member.user_id == user_id:
                member.is_active = False
                break
        
        self.updated_at = datetime.utcnow()
        self.save()
    
    def get_member_by_id(self, user_id):
        """Get a specific member by user ID"""
        for member in self.members:
            if member.user_id == user_id and member.is_active:
                return member
        return None
    
    def is_member(self, user_id):
        """Check if a user is an active member of the project"""
        return self.get_member_by_id(user_id) is not None
    
    def get_member_role(self, user_id):
        """Get the role of a specific member"""
        member = self.get_member_by_id(user_id)
        return member.role if member else None
    
    def save(self, *args, **kwargs):
        """Override save to update timestamp"""
        self.updated_at = datetime.utcnow()
        super().save(*args, **kwargs)