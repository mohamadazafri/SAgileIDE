from django.urls import path
from . import views

app_name = 'projects'

urlpatterns = [
    # Project CRUD endpoints
    path('', views.project_list_view, name='project_list'),
    
    # Project search and user-specific endpoints (must come before <str:pk>/)
    path('search/', views.project_search_view, name='project_search'),
    path('my-projects/', views.user_projects_view, name='user_projects'),
    
    # Project detail endpoint (must come after specific patterns)
    path('<str:pk>/', views.project_detail_view, name='project_detail'),
    
    # Project membership endpoints
    path('<str:project_id>/members/', views.project_membership_view, name='project_members'),
    path('<str:project_id>/members/<str:pk>/', views.project_membership_detail_view, name='project_member_detail'),
    path('<str:project_id>/add-member/', views.add_project_member_view, name='add_project_member'),
    path('<str:project_id>/remove-member/<str:user_id>/', views.remove_project_member_view, name='remove_project_member'),
]
