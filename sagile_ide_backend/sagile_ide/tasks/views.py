from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from bson import ObjectId
from .models import Task, CodeLink, TaskComment
# Serializers removed - using manual data construction instead
from projects.models import Project
from users.models import User


# ============================================================================
# TASK CRUD VIEWS
# ============================================================================

@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated])
def task_list_view(request):
    """View for listing and creating tasks"""
    try:
        user_id = ObjectId(request.user.id)
        user = User.objects.get(id=user_id)
        
        if request.method == 'GET':
            # Users can see tasks for projects they're members of
            if user.role in ['project-manager', 'scrum-master']:
                tasks = Task.objects.all()
            else:
                # Get projects where user is a member, then get their tasks
                user_projects = Project.objects(members__user_id=user_id, members__is_active=True)
                project_ids = [p.id for p in user_projects]
                tasks = Task.objects(project_id__in=project_ids)
            
            # Manually construct task data
            tasks_data = []
            for task in tasks:
                task_data = {
                    'id': str(task.id),
                    'sagile_id': task.sagile_id,
                    'title': task.title,
                    'description': task.description,
                    'status': task.status,
                    'priority': task.priority,
                    'task_type': task.task_type,
                    'project_id': str(task.project_id),
                    'assignee_id': str(task.assignee_id) if task.assignee_id else None,
                    'assignee_username': task.assignee_username,
                    'reporter_id': str(task.reporter_id),
                    'reporter_username': task.reporter_username,
                    'progress': task.progress,
                    'estimated_hours': task.estimated_hours,
                    'actual_hours': task.actual_hours,
                    'due_date': task.due_date.isoformat() if task.due_date else None,
                    'code_links_count': len(task.code_links),
                    'comments_count': len(task.comments),
                    'created_at': task.created_at.isoformat() if task.created_at else None,
                    'updated_at': task.updated_at.isoformat() if task.updated_at else None
                }
                tasks_data.append(task_data)
            
            return Response({'tasks': tasks_data})
            
        elif request.method == 'POST':
            # Create new task
            sagile_id = request.data.get('sagile_id')
            title = request.data.get('title')
            description = request.data.get('description', '')
            project_id = request.data.get('project_id')
            assignee_id = request.data.get('assignee_id')
            priority = request.data.get('priority', 'medium')
            task_type = request.data.get('task_type', 'task')
            estimated_hours = request.data.get('estimated_hours', 0)
            due_date = request.data.get('due_date')
            
            # Validate required fields
            if not sagile_id or not title or not project_id:
                return Response({'error': 'sagile_id, title, and project_id are required'}, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                project_id = ObjectId(project_id)
            except:
                return Response({'error': 'Invalid project_id format'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if project exists and user has access
            try:
                project = Project.objects.get(id=project_id)
                if not (user.role in ['project-manager', 'scrum-master'] or project.is_member(user_id)):
                    return Response({'error': 'You do not have access to this project'}, status=status.HTTP_403_FORBIDDEN)
            except Project.DoesNotExist:
                return Response({'error': 'Project not found'}, status=status.HTTP_404_NOT_FOUND)
            
            # Validate SAgile ID format
            if not sagile_id.startswith('TASK-'):
                return Response({'error': "SAgile ID must start with 'TASK-'"}, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if SAgile ID already exists
            if Task.objects(sagile_id=sagile_id).count() > 0:
                return Response({'error': 'SAgile ID already exists'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate assignee if provided
            assignee_username = None
            if assignee_id:
                try:
                    assignee_id = ObjectId(assignee_id)
                    assignee = User.objects.get(id=assignee_id)
                    assignee_username = assignee.username
                except:
                    return Response({'error': 'Invalid assignee_id'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Create task
            task = Task(
                sagile_id=sagile_id,
                title=title,
                description=description,
                project_id=project_id,
                assignee_id=assignee_id,
                assignee_username=assignee_username,
                reporter_id=user_id,
                reporter_username=user.username,
                priority=priority,
                task_type=task_type,
                estimated_hours=estimated_hours,
                due_date=due_date
            )
            task.save()
            
            # Return created task data
            task_data = {
                'id': str(task.id),
                'sagile_id': task.sagile_id,
                'title': task.title,
                'description': task.description,
                'status': task.status,
                'priority': task.priority,
                'task_type': task.task_type,
                'project_id': str(task.project_id),
                'assignee_id': str(task.assignee_id) if task.assignee_id else None,
                'assignee_username': task.assignee_username,
                'reporter_id': str(task.reporter_id),
                'reporter_username': task.reporter_username,
                'progress': task.progress,
                'estimated_hours': task.estimated_hours,
                'due_date': task.due_date.isoformat() if task.due_date else None,
                'created_at': task.created_at.isoformat() if task.created_at else None
            }
            
            return Response(task_data, status=status.HTTP_201_CREATED)
            
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([permissions.IsAuthenticated])
def task_detail_view(request, pk):
    """View for task detail operations"""
    try:
        task = Task.objects.get(id=ObjectId(pk))
        user_id = ObjectId(request.user.id)
        user = User.objects.get(id=user_id)
        
        # Check if user has access to this task's project
        try:
            project = Project.objects.get(id=task.project_id)
            if not (user.role in ['project-manager', 'scrum-master'] or project.is_member(user_id)):
                return Response({'error': 'You do not have access to this task'}, status=status.HTTP_403_FORBIDDEN)
        except Project.DoesNotExist:
            return Response({'error': 'Associated project not found'}, status=status.HTTP_404_NOT_FOUND)
        
        if request.method == 'GET':
            # Return full task details
            task_data = {
                'id': str(task.id),
                'sagile_id': task.sagile_id,
                'title': task.title,
                'description': task.description,
                'status': task.status,
                'priority': task.priority,
                'task_type': task.task_type,
                'project_id': str(task.project_id),
                'assignee_id': str(task.assignee_id) if task.assignee_id else None,
                'assignee_username': task.assignee_username,
                'reporter_id': str(task.reporter_id),
                'reporter_username': task.reporter_username,
                'progress': task.progress,
                'estimated_hours': task.estimated_hours,
                'actual_hours': task.actual_hours,
                'due_date': task.due_date.isoformat() if task.due_date else None,
                'created_at': task.created_at.isoformat() if task.created_at else None,
                'updated_at': task.updated_at.isoformat() if task.updated_at else None,
                'code_links': [
                    {
                        'file_path': link.file_path,
                        'line_number': link.line_number,
                        'description': link.description,
                        'created_by': str(link.created_by),
                        'created_at': link.created_at.isoformat() if link.created_at else None
                    } for link in task.code_links
                ],
                'comments': [
                    {
                        'content': comment.content,
                        'author_id': str(comment.author_id),
                        'author_username': comment.author_username,
                        'created_at': comment.created_at.isoformat() if comment.created_at else None
                    } for comment in task.comments
                ]
            }
            return Response(task_data)
            
        elif request.method in ['PUT', 'PATCH']:
            # Update task (assignees, reporters, or project managers can update)
            can_update = (task.assignee_id == user_id or 
                         task.reporter_id == user_id or 
                         user.role in ['project-manager', 'scrum-master'])
            
            if not can_update:
                return Response({'error': 'You do not have permission to update this task'}, status=status.HTTP_403_FORBIDDEN)
            
            # Update fields
            if 'title' in request.data:
                task.title = request.data['title']
            if 'description' in request.data:
                task.description = request.data['description']
            if 'status' in request.data:
                task.status = request.data['status']
            if 'priority' in request.data:
                task.priority = request.data['priority']
            if 'assignee_id' in request.data:
                assignee_id = request.data['assignee_id']
                if assignee_id:
                    try:
                        assignee = User.objects.get(id=ObjectId(assignee_id))
                        task.assignee_id = ObjectId(assignee_id)
                        task.assignee_username = assignee.username
                    except:
                        return Response({'error': 'Invalid assignee_id'}, status=status.HTTP_400_BAD_REQUEST)
                else:
                    task.assignee_id = None
                    task.assignee_username = None
            if 'progress' in request.data:
                task.progress = request.data['progress']
            if 'estimated_hours' in request.data:
                task.estimated_hours = request.data['estimated_hours']
            if 'actual_hours' in request.data:
                task.actual_hours = request.data['actual_hours']
            if 'due_date' in request.data:
                task.due_date = request.data['due_date']
            
            task.save()
            
            # Return updated task data
            task_data = {
                'id': str(task.id),
                'sagile_id': task.sagile_id,
                'title': task.title,
                'description': task.description,
                'status': task.status,
                'priority': task.priority,
                'progress': task.progress,
                'estimated_hours': task.estimated_hours,
                'actual_hours': task.actual_hours,
                'due_date': task.due_date.isoformat() if task.due_date else None,
                'updated_at': task.updated_at.isoformat() if task.updated_at else None
            }
            return Response(task_data)
            
        elif request.method == 'DELETE':
            # Delete task (only reporters or project managers can delete)
            can_delete = (task.reporter_id == user_id or 
                         user.role in ['project-manager', 'scrum-master'])
            
            if not can_delete:
                return Response({'error': 'You do not have permission to delete this task'}, status=status.HTTP_403_FORBIDDEN)
            
            task.delete()
            return Response({'message': 'Task deleted successfully'}, status=status.HTTP_204_NO_CONTENT)
            
    except Task.DoesNotExist:
        return Response({'error': 'Task not found'}, status=status.HTTP_404_NOT_FOUND)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================================
# PROJECT-SPECIFIC AND USER-SPECIFIC TASK VIEWS
# ============================================================================

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def tasks_by_project_view(request, project_id):
    """View for getting tasks by project ID"""
    try:
        user_id = ObjectId(request.user.id)
        user = User.objects.get(id=user_id)
        project_id = ObjectId(project_id)
        
        # Check if user has access to this project
        try:
            project = Project.objects.get(id=project_id)
            if not (user.role in ['project-manager', 'scrum-master'] or project.is_member(user_id)):
                return Response({'error': 'You do not have access to this project'}, status=status.HTTP_403_FORBIDDEN)
        except Project.DoesNotExist:
            return Response({'error': 'Project not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Get tasks for this project
        tasks = Task.objects(project_id=project_id)
        
        # Manually construct task data
        tasks_data = []
        for task in tasks:
            task_data = {
                'id': str(task.id),
                'sagile_id': task.sagile_id,
                'title': task.title,
                'status': task.status,
                'priority': task.priority,
                'task_type': task.task_type,
                'assignee_id': str(task.assignee_id) if task.assignee_id else None,
                'assignee_username': task.assignee_username,
                'progress': task.progress,
                'due_date': task.due_date.isoformat() if task.due_date else None,
                'created_at': task.created_at.isoformat() if task.created_at else None
            }
            tasks_data.append(task_data)
        
        return Response({'tasks': tasks_data})
        
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def user_tasks_view(request):
    """View for getting current user's assigned tasks"""
    try:
        user_id = ObjectId(request.user.id)
        
        # Get tasks assigned to current user
        tasks = Task.objects(assignee_id=user_id)
        
        # Manually construct task data
        tasks_data = []
        for task in tasks:
            task_data = {
                'id': str(task.id),
                'sagile_id': task.sagile_id,
                'title': task.title,
                'status': task.status,
                'priority': task.priority,
                'task_type': task.task_type,
                'project_id': str(task.project_id),
                'progress': task.progress,
                'due_date': task.due_date.isoformat() if task.due_date else None,
                'created_at': task.created_at.isoformat() if task.created_at else None
            }
            tasks_data.append(task_data)
        
        return Response({'tasks': tasks_data})
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def task_search_view(request):
    """View for searching tasks"""
    query = request.query_params.get('q', '')
    if not query:
        return Response({'tasks': []})
    
    try:
        user_id = ObjectId(request.user.id)
        user = User.objects.get(id=user_id)
        
        # Filter tasks based on user role and project access
        if user.role in ['project-manager', 'scrum-master']:
            # Search all tasks
            tasks = Task.objects(
                title__icontains=query
            ) | Task.objects(
                description__icontains=query
            ) | Task.objects(
                sagile_id__icontains=query
            )
        else:
            # Only search tasks in projects where user is a member
            user_projects = Project.objects(members__user_id=user_id, members__is_active=True)
            project_ids = [p.id for p in user_projects]
            
            tasks = Task.objects(
                project_id__in=project_ids,
                title__icontains=query
            ) | Task.objects(
                project_id__in=project_ids,
                description__icontains=query
            ) | Task.objects(
                project_id__in=project_ids,
                sagile_id__icontains=query
            )
        
        tasks = tasks[:20]  # Limit to 20 results
        
        # Manually construct task data
        tasks_data = []
        for task in tasks:
            task_data = {
                'id': str(task.id),
                'sagile_id': task.sagile_id,
                'title': task.title,
                'status': task.status,
                'priority': task.priority,
                'project_id': str(task.project_id),
                'assignee_username': task.assignee_username,
                'created_at': task.created_at.isoformat() if task.created_at else None
            }
            tasks_data.append(task_data)
        
        return Response({'tasks': tasks_data})
        
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================================
# TASK CODE LINKS AND COMMENTS
# ============================================================================

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def add_code_link_view(request, task_id):
    """View for adding code links to tasks"""
    try:
        task = Task.objects.get(id=ObjectId(task_id))
        user_id = ObjectId(request.user.id)
        user = User.objects.get(id=user_id)
        
        # Check if user has access to this task's project
        try:
            project = Project.objects.get(id=task.project_id)
            if not (user.role in ['project-manager', 'scrum-master'] or project.is_member(user_id)):
                return Response({'error': 'You do not have permission to add code links to this task'}, status=status.HTTP_403_FORBIDDEN)
        except Project.DoesNotExist:
            return Response({'error': 'Associated project not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Validate request data
        file_path = request.data.get('file_path')
        line_number = request.data.get('line_number')
        description = request.data.get('description', '')
        
        if not file_path:
            return Response({'error': 'file_path is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Add code link
        code_link = CodeLink(
            file_path=file_path,
            line_number=line_number,
            description=description,
            created_by=user_id
        )
        task.code_links.append(code_link)
        task.save()
        
        return Response({
            'message': 'Code link added successfully',
            'task_id': str(task.id),
            'code_links_count': len(task.code_links)
        }, status=status.HTTP_201_CREATED)
        
    except Task.DoesNotExist:
        return Response({'error': 'Task not found'}, status=status.HTTP_404_NOT_FOUND)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def add_task_comment_view(request, task_id):
    """View for adding comments to tasks"""
    try:
        task = Task.objects.get(id=ObjectId(task_id))
        user_id = ObjectId(request.user.id)
        user = User.objects.get(id=user_id)
        
        # Check if user has access to this task's project
        try:
            project = Project.objects.get(id=task.project_id)
            if not (user.role in ['project-manager', 'scrum-master'] or project.is_member(user_id)):
                return Response({'error': 'You do not have permission to comment on this task'}, status=status.HTTP_403_FORBIDDEN)
        except Project.DoesNotExist:
            return Response({'error': 'Associated project not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Validate request data
        content = request.data.get('content')
        
        if not content:
            return Response({'error': 'content is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Add comment
        comment = TaskComment(
            content=content,
            author_id=user_id,
            author_username=user.username
        )
        task.comments.append(comment)
        task.save()
        
        return Response({
            'message': 'Comment added successfully',
            'task_id': str(task.id),
            'comments_count': len(task.comments)
        }, status=status.HTTP_201_CREATED)
        
    except Task.DoesNotExist:
        return Response({'error': 'Task not found'}, status=status.HTTP_404_NOT_FOUND)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated])
def update_task_progress_view(request, task_id):
    """View for updating task progress"""
    try:
        task = Task.objects.get(id=ObjectId(task_id))
        user_id = ObjectId(request.user.id)
        user = User.objects.get(id=user_id)
        
        # Check if user has permission to update progress (assignee or project managers)
        can_update = (task.assignee_id == user_id or 
                     user.role in ['project-manager', 'scrum-master'])
        
        if not can_update:
            return Response({'error': 'You do not have permission to update this task progress'}, status=status.HTTP_403_FORBIDDEN)
        
        # Validate request data
        progress = request.data.get('progress')
        
        if progress is None:
            return Response({'error': 'progress is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            progress = int(progress)
            if progress < 0 or progress > 100:
                raise ValueError()
        except (ValueError, TypeError):
            return Response({'error': 'progress must be an integer between 0 and 100'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Update progress
        task.progress = progress
        
        # Auto-update status based on progress
        if progress == 0:
            task.status = 'todo'
        elif progress == 100:
            task.status = 'done'
        else:
            task.status = 'in-progress'
        
        task.save()
        
        return Response({
            'message': 'Task progress updated successfully',
            'task': {
                'id': str(task.id),
                'progress': task.progress,
                'status': task.status
            }
        })
        
    except Task.DoesNotExist:
        return Response({'error': 'Task not found'}, status=status.HTTP_404_NOT_FOUND)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)