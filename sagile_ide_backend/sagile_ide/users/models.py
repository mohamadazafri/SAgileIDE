from mongoengine import Document, fields
from datetime import datetime


class User(Document):
    """
    User model for SAgile IDE using MongoDB
    """
    ROLE_CHOICES = [
        ('scrum-master', 'Scrum Master'),
        ('developer', 'Developer'),
        ('project-manager', 'Project Manager'),
        ('tester', 'Tester'),
        ('product-owner', 'Product Owner'),
    ]
    
    # Basic user fields
    username = fields.StringField(max_length=150, unique=True, required=True)
    email = fields.EmailField(required=True)
    first_name = fields.StringField(max_length=150, default='')
    last_name = fields.StringField(max_length=150, default='')
    password = fields.StringField(required=True)  # Will store hashed password
    
    # SAgile specific fields
    role = fields.StringField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='developer',
        help_text="User's role in the SAgile project"
    )
    
    avatar = fields.URLField(
        null=True,
        help_text="URL to user's avatar image"
    )
    
    bio = fields.StringField(
        max_length=1000,
        default='',
        help_text="User's bio/description"
    )
    
    github_username = fields.StringField(
        max_length=100,
        default='',
        help_text="GitHub username for integration"
    )
    
    # Django auth fields
    is_active = fields.BooleanField(default=True)
    is_staff = fields.BooleanField(default=False)
    is_superuser = fields.BooleanField(default=False)
    date_joined = fields.DateTimeField(default=datetime.utcnow)
    last_login = fields.DateTimeField(null=True)
    
    # MongoDB specific
    meta = {
        'collection': 'users',
        'indexes': [
            'username',
            'email',
            'role',
            ('username', 'email')
        ]
    }
    
    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"
    
    @property
    def initials(self):
        """Get user initials for avatar display"""
        if self.first_name and self.last_name:
            return f"{self.first_name[0]}{self.last_name[0]}".upper()
        elif self.first_name:
            return self.first_name[0].upper()
        else:
            return self.username[:2].upper()
    
    def get_full_name(self):
        """Return the first_name plus the last_name, with a space in between."""
        full_name = f"{self.first_name} {self.last_name}"
        return full_name.strip()
    
    def get_short_name(self):
        """Return the short name for the user."""
        return self.first_name
    
    def can_manage_tasks(self):
        """Check if user can manage tasks (Scrum Master, Project Manager)"""
        return self.role in ['scrum-master', 'project-manager']
    
    def can_update_progress(self):
        """Check if user can update task progress (Scrum Master)"""
        return self.role == 'scrum-master'
    
    def get_role_display(self):
        """Get human-readable role name"""
        role_dict = dict(self.ROLE_CHOICES)
        return role_dict.get(self.role, self.role)
    
    def set_password(self, raw_password):
        """Set password using Django's password hashing"""
        from django.contrib.auth.hashers import make_password
        self.password = make_password(raw_password)
    
    def check_password(self, raw_password):
        """Check password using Django's password checking"""
        from django.contrib.auth.hashers import check_password
        return check_password(raw_password, self.password)
    
    def save(self, *args, **kwargs):
        """Override save to handle password hashing"""
        if not self.date_joined:
            self.date_joined = datetime.utcnow()
        super().save(*args, **kwargs)
    
    # Django authentication compatibility methods
    @property
    def is_authenticated(self):
        return True
    
    @property
    def is_anonymous(self):
        return False
    
    def get_username(self):
        return self.username
    
    def has_perm(self, perm, obj=None):
        return self.is_superuser
    
    def has_module_perms(self, app_label):
        return self.is_superuser