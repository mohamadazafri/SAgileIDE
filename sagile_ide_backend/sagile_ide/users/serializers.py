from rest_framework import serializers
from bson import ObjectId
from .models import User


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


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model"""
    id = ObjectIdField(read_only=True)
    initials = serializers.ReadOnlyField()
    full_name = serializers.ReadOnlyField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'full_name',
            'role', 'avatar', 'bio', 'github_username', 'initials',
            'is_active', 'is_staff', 'date_joined', 'last_login'
        ]
        read_only_fields = ['id', 'date_joined', 'last_login', 'is_staff']


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration"""
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'password_confirm',
            'first_name', 'last_name', 'role', 'bio', 'github_username'
        ]
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("Passwords don't match")
        
        # Check if username already exists
        if User.objects(username=attrs['username']).count() > 0:
            raise serializers.ValidationError("Username already exists")
        
        # Check if email already exists
        if User.objects(email=attrs['email']).count() > 0:
            raise serializers.ValidationError("Email already exists")
        
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserLoginSerializer(serializers.Serializer):
    """Serializer for user login"""
    username = serializers.CharField()
    password = serializers.CharField()
    
    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')
        
        if username and password:
            try:
                user = User.objects.get(username=username)
                if not user.check_password(password):
                    raise serializers.ValidationError('Invalid credentials')
                if not user.is_active:
                    raise serializers.ValidationError('User account is disabled')
                attrs['user'] = user
            except User.DoesNotExist:
                raise serializers.ValidationError('Invalid credentials')
        else:
            raise serializers.ValidationError('Must include username and password')
        
        return attrs


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for user profile updates"""
    id = ObjectIdField(read_only=True)
    initials = serializers.ReadOnlyField()
    full_name = serializers.ReadOnlyField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'full_name',
            'role', 'avatar', 'bio', 'github_username', 'initials'
        ]
        read_only_fields = ['id', 'username']


class UserListSerializer(serializers.ModelSerializer):
    """Simplified serializer for user lists"""
    id = ObjectIdField(read_only=True)
    initials = serializers.ReadOnlyField()
    full_name = serializers.ReadOnlyField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'full_name',
            'role', 'initials', 'is_active'
        ]