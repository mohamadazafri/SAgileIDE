from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth.models import AnonymousUser
from .models import User


class MongoEngineSessionAuthentication(BaseAuthentication):
    """
    Custom authentication for MongoEngine users using session data
    """
    
    def authenticate(self, request):
        """
        Returns a two-tuple of `User` and `token` if authentication is successful.
        Otherwise returns `None`.
        """
        # Check if user is authenticated via session
        if not request.session.get('is_authenticated', False):
            return None
            
        user_id = request.session.get('user_id')
        username = request.session.get('username')
        
        if not user_id or not username:
            return None
            
        try:
            # Get the MongoEngine user
            user = User.objects.get(id=user_id, username=username)
            if not user.is_active:
                raise AuthenticationFailed('User account is disabled')
            return (user, None)
        except User.DoesNotExist:
            raise AuthenticationFailed('User not found')
    
    def authenticate_header(self, request):
        """
        Return a string to be used as the value of the `WWW-Authenticate`
        header in a `401 Unauthenticated` response, or `None` if the
        authentication scheme should return `403 Permission Denied` responses.
        """
        return 'Session'
