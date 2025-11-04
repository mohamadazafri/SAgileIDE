from django.urls import path
from . import views

app_name = 'tasks'

urlpatterns = [
    # Task CRUD endpoints
    path('', views.task_list_view, name='task_list'),
    
    # Task-specific endpoints (must come before <str:pk>/)
    path('by-project/<str:project_id>/', views.tasks_by_project_view, name='tasks_by_project'),
    path('my-tasks/', views.user_tasks_view, name='user_tasks'),
    path('search/', views.task_search_view, name='task_search'),
    
    # Task detail endpoint (must come after specific patterns)
    path('<str:pk>/', views.task_detail_view, name='task_detail'),
    
    # Task operations
    path('<str:task_id>/add-code-link/', views.add_code_link_view, name='add_code_link'),
    path('<str:task_id>/add-comment/', views.add_task_comment_view, name='add_task_comment'),
    path('<str:task_id>/update-progress/', views.update_task_progress_view, name='update_task_progress'),
]
