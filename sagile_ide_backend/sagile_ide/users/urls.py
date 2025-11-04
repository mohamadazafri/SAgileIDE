from django.urls import path
from . import views

app_name = 'users'

urlpatterns = [
    # Authentication endpoints
    path('register/', views.user_registration_view, name='register'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    
    # User management endpoints
    path('profile/', views.user_profile_view, name='profile'),
    path('current/', views.current_user_view, name='current_user'),
    path('list/', views.user_list_view, name='user_list'),
    path('<str:user_id>/', views.user_by_id_view, name='user_by_id'),
]
