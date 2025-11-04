from django.urls import path
from . import views

app_name = 'repositories'

urlpatterns = [
    # Template endpoints (must come before generic patterns)
    path('templates/', views.get_project_templates_view, name='get_project_templates'),
    path('templates/<str:template_id>/preview/', views.get_template_preview_view, name='get_template_preview'),
    path('templates/create/', views.create_custom_template_view, name='create_custom_template'),
    
    # Repository CRUD endpoints
    path('', views.repository_list_view, name='repository_list'),
    
    # Repository-specific endpoints (must come before <str:pk>/)
    path('by-project/<str:project_id>/', views.repository_by_project_view, name='repository_by_project'),
    path('<str:repository_id>/files/', views.repository_files_view, name='repository_files'),
    path('<str:repository_id>/add-file/', views.add_repository_file_view, name='add_repository_file'),
    path('<str:repository_id>/files/<path:file_path>/update/', views.update_repository_file_view, name='update_repository_file'),
    path('<str:repository_id>/files/<path:file_path>/delete/', views.delete_repository_file_view, name='delete_repository_file'),
    
    # Repository detail endpoint (must come after specific patterns)
    path('<str:pk>/', views.repository_detail_view, name='repository_detail'),
]
