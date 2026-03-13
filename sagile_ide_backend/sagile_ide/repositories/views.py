import os
import shutil
import subprocess
from django.conf import settings
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from bson import ObjectId
from datetime import datetime
from .models import Repository, RepositoryFile
from .template_service import template_service
# Serializers removed - using manual data construction instead
from projects.models import Project
from users.models import User


# ============================================================================
# REPOSITORY CRUD VIEWS
# ============================================================================

@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated])
def repository_list_view(request):
    """View for listing and creating repositories"""
    try:
        user_id = ObjectId(request.user.id)
        user = User.objects.get(id=user_id)
        
        if request.method == 'GET':
            # Users can see repositories for projects they're members of
            if user.role in ['project-manager', 'scrum-master']:
                repositories = Repository.objects.all()
            else:
                # Get projects where user is a member, then get their repositories
                user_projects = Project.objects(members__user_id=user_id, members__is_active=True)
                project_ids = [p.id for p in user_projects]
                repositories = Repository.objects(project_id__in=project_ids)
            
            # Manually construct repository data
            repositories_data = []
            for repo in repositories:
                repo_data = {
                    'id': str(repo.id),
                    'name': repo.name,
                    'description': repo.description,
                    'project_id': str(repo.project_id),
                    'project_sagile_id': repo.project_sagile_id,
                    'access_level': repo.access_level,
                    'access_display': repo.get_access_display(),
                    'project_type': repo.project_type,
                    'project_type_display': repo.get_project_type_display(),
                    'full_name': repo.full_name,
                    'created_by': str(repo.created_by) if repo.created_by else None,
                    'created_by_username': repo.created_by_username,
                    'file_count': len(repo.files),
                    'is_initialized': repo.is_initialized,
                    'created_at': repo.created_at.isoformat() if repo.created_at else None,
                    'updated_at': repo.updated_at.isoformat() if repo.updated_at else None
                }
                repositories_data.append(repo_data)
            
            return Response({'repositories': repositories_data})
            
        elif request.method == 'POST':
            # Create new repository
            name = request.data.get('name')
            description = request.data.get('description', '')
            project_id = request.data.get('project_id')
            access_level = request.data.get('access_level', 'private')
            project_type = request.data.get('project_type', 'fresh')
            template_id = request.data.get('template_id')
            template_variables = request.data.get('template_variables', {})
            
            # Validate required fields
            if not name or not project_id:
                return Response({'error': 'name and project_id are required'}, status=status.HTTP_400_BAD_REQUEST)
            
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
            
            # Check if repository name already exists for this project
            if Repository.objects(name=name, project_id=project_id).count() > 0:
                return Response({'error': 'Repository name already exists for this project'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Create repository
            repository = Repository(
                name=name,
                description=description,
                project_id=project_id,
                project_sagile_id=project.sagile_id,
                access_level=access_level,
                project_type=project_type,
                created_by=user_id,
                created_by_username=user.username
            )
            
            # Initialize git repository
            base_storage = settings.BASE_DIR / 'projects_storage'
            repo_path = base_storage / str(project_id)
            
            os.makedirs(repo_path, exist_ok=True)
            if not (repo_path / '.git').exists():
                subprocess.run(['git', 'init'], cwd=repo_path, check=True)
                subprocess.run(['git', 'config', 'user.email', 'sagile@example.com'], cwd=repo_path, check=True)
                subprocess.run(['git', 'config', 'user.name', 'SAgile IDE'], cwd=repo_path, check=True)
            
            repository.root_path = str(repo_path)
            repository.is_initialized = True
            
            repository.save()
            
            # Apply template if provided
            if template_id and project_type == 'template':
                template_success = template_service.apply_template_to_repository(
                    repository=repository,
                    template_id=template_id,
                    template_variables=template_variables
                )
                if not template_success:
                    return Response({'error': 'Failed to apply template'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Return created repository data
            repo_data = {
                'id': str(repository.id),
                'name': repository.name,
                'description': repository.description,
                'project_id': str(repository.project_id),
                'project_sagile_id': repository.project_sagile_id,
                'access_level': repository.access_level,
                'access_display': repository.get_access_display(),
                'project_type': repository.project_type,
                'project_type_display': repository.get_project_type_display(),
                'full_name': repository.full_name,
                'created_by': str(repository.created_by) if repository.created_by else None,
                'created_by_username': repository.created_by_username,
                'file_count': len(repository.files),
                'is_initialized': repository.is_initialized,
                'created_at': repository.created_at.isoformat() if repository.created_at else None
            }
            
            return Response(repo_data, status=status.HTTP_201_CREATED)
            
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([permissions.IsAuthenticated])
def repository_detail_view(request, pk):
    """View for repository detail operations"""
    try:
        repository = Repository.objects.get(id=ObjectId(pk))
        user_id = ObjectId(request.user.id)
        user = User.objects.get(id=user_id)
        
        # Check if user has access to this repository's project
        try:
            project = Project.objects.get(id=repository.project_id)
            if not (user.role in ['project-manager', 'scrum-master'] or project.is_member(user_id)):
                return Response({'error': 'You do not have access to this repository'}, status=status.HTTP_403_FORBIDDEN)
        except Project.DoesNotExist:
            return Response({'error': 'Associated project not found'}, status=status.HTTP_404_NOT_FOUND)
        
        if request.method == 'GET':
            # Return full repository details
            repo_data = {
                'id': str(repository.id),
                'name': repository.name,
                'description': repository.description,
                'project_id': str(repository.project_id),
                'project_sagile_id': repository.project_sagile_id,
                'access_level': repository.access_level,
                'access_display': repository.get_access_display(),
                'project_type': repository.project_type,
                'project_type_display': repository.get_project_type_display(),
                'full_name': repository.full_name,
                'created_by': str(repository.created_by) if repository.created_by else None,
                'created_by_username': repository.created_by_username,
                'file_count': len(repository.files),
                'is_initialized': repository.is_initialized,
                'created_at': repository.created_at.isoformat() if repository.created_at else None,
                'updated_at': repository.updated_at.isoformat() if repository.updated_at else None,
                'files': [
                    {
                        'file_path': file.file_path,
                        'file_name': file.file_name,
                        'file_type': file.file_type,
                        'file_extension': file.file_extension,
                        'file_size': file.file_size,
                        'content': getattr(file, 'content', ''),
                        'last_modified': file.last_modified.isoformat() if file.last_modified else None,
                        'last_modified_by': str(file.last_modified_by) if file.last_modified_by else None,
                        'last_modified_by_username': file.last_modified_by_username,
                        'created_at': file.created_at.isoformat() if file.created_at else None
                    } for file in repository.files
                ]
            }
            return Response(repo_data)
            
        elif request.method in ['PUT', 'PATCH']:
            # Update repository (only project members can update)
            if not (user.role in ['project-manager', 'scrum-master'] or project.is_member(user_id)):
                return Response({'error': 'You do not have permission to update this repository'}, status=status.HTTP_403_FORBIDDEN)
            
            # Update fields
            if 'name' in request.data:
                # Check if new name already exists for this project
                existing = Repository.objects(name=request.data['name'], project_id=repository.project_id).exclude(id=repository.id).count()
                if existing > 0:
                    return Response({'error': 'Repository name already exists for this project'}, status=status.HTTP_400_BAD_REQUEST)
                repository.name = request.data['name']
            if 'description' in request.data:
                repository.description = request.data['description']
            if 'access_level' in request.data:
                repository.access_level = request.data['access_level']
            if 'project_type' in request.data:
                repository.project_type = request.data['project_type']
            
            repository.save()
            
            # Return updated repository data
            repo_data = {
                'id': str(repository.id),
                'name': repository.name,
                'description': repository.description,
                'project_id': str(repository.project_id),
                'project_sagile_id': repository.project_sagile_id,
                'access_level': repository.access_level,
                'access_display': repository.get_access_display(),
                'project_type': repository.project_type,
                'project_type_display': repository.get_project_type_display(),
                'full_name': repository.full_name,
                'file_count': len(repository.files),
                'is_initialized': repository.is_initialized,
                'updated_at': repository.updated_at.isoformat() if repository.updated_at else None
            }
            return Response(repo_data)
            
        elif request.method == 'DELETE':
            # Delete repository (only project managers or creators can delete)
            if not (user.role in ['project-manager', 'scrum-master'] or repository.created_by == user_id):
                return Response({'error': 'You do not have permission to delete this repository'}, status=status.HTTP_403_FORBIDDEN)
            
            repository.delete()
            return Response({'message': 'Repository deleted successfully'}, status=status.HTTP_204_NO_CONTENT)
            
    except Repository.DoesNotExist:
        return Response({'error': 'Repository not found'}, status=status.HTTP_404_NOT_FOUND)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================================
# PROJECT-SPECIFIC REPOSITORY VIEWS
# ============================================================================

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def repository_by_project_view(request, project_id):
    """View for getting repository by project ID"""
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
        
        # Get repository for this project
        try:
            repository = Repository.objects.get(project_id=project_id)
            
            # Return repository data
            repo_data = {
                'id': str(repository.id),
                'name': repository.name,
                'description': repository.description,
                'project_id': str(repository.project_id),
                'project_sagile_id': repository.project_sagile_id,
                'access_level': repository.access_level,
                'access_display': repository.get_access_display(),
                'project_type': repository.project_type,
                'project_type_display': repository.get_project_type_display(),
                'full_name': repository.full_name,
                'created_by': str(repository.created_by) if repository.created_by else None,
                'created_by_username': repository.created_by_username,
                'file_count': len(repository.files),
                'is_initialized': repository.is_initialized,
                'created_at': repository.created_at.isoformat() if repository.created_at else None,
                'updated_at': repository.updated_at.isoformat() if repository.updated_at else None
            }
            return Response(repo_data)
            
        except Repository.DoesNotExist:
            return Response({'error': 'Repository not found for this project'}, status=status.HTTP_404_NOT_FOUND)
            
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================================
# REPOSITORY FILE MANAGEMENT VIEWS
# ============================================================================

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def add_repository_file_view(request, repository_id):
    """View for adding files to repository"""
    try:
        repository = Repository.objects.get(id=ObjectId(repository_id))
        user_id = ObjectId(request.user.id)
        user = User.objects.get(id=user_id)
        
        # Check if user has access to this repository's project
        try:
            project = Project.objects.get(id=repository.project_id)
            if not (user.role in ['project-manager', 'scrum-master'] or project.is_member(user_id)):
                return Response({'error': 'You do not have permission to add files to this repository'}, status=status.HTTP_403_FORBIDDEN)
        except Project.DoesNotExist:
            return Response({'error': 'Associated project not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Validate request data
        file_path = request.data.get('file_path')
        file_name = request.data.get('file_name')
        file_type = request.data.get('file_type', 'code')
        file_size = request.data.get('file_size')
        
        if not file_path or not file_name:
            return Response({'error': 'file_path and file_name are required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Use the repository's add_file method
        repository.add_file(
            file_path=file_path,
            file_name=file_name,
            file_type=file_type,
            file_size=file_size,
            modified_by=user_id,
            modified_by_username=user.username
        )
        
        repository.save()

        # Write the actual file to disk so Git can track it
        if repository.root_path:
            full_path = os.path.normpath(os.path.join(repository.root_path, file_path))
            # Guard against path traversal
            if full_path.startswith(os.path.normpath(repository.root_path)):
                dir_path = os.path.dirname(full_path)
                if dir_path:
                    os.makedirs(dir_path, exist_ok=True)
                content = request.data.get('content', '')
                with open(full_path, 'w', encoding='utf-8') as f:
                    f.write(content)

        # Return success message with repository info
        return Response({
            'message': 'File added/updated successfully',
            'repository': {
                'id': str(repository.id),
                'name': repository.name,
                'file_count': len(repository.files)
            }
        }, status=status.HTTP_201_CREATED)
        
    except Repository.DoesNotExist:
        return Response({'error': 'Repository not found'}, status=status.HTTP_404_NOT_FOUND)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PUT', 'PATCH'])
@permission_classes([permissions.IsAuthenticated])
def update_repository_file_view(request, repository_id, file_path):
    """View for updating repository files"""
    try:
        repository = Repository.objects.get(id=ObjectId(repository_id))
        user_id = ObjectId(request.user.id)
        user = User.objects.get(id=user_id)
        
        # Check if user has access to this repository's project
        try:
            project = Project.objects.get(id=repository.project_id)
            if not (user.role in ['project-manager', 'scrum-master'] or project.is_member(user_id)):
                return Response({'error': 'You do not have permission to update files in this repository'}, status=status.HTTP_403_FORBIDDEN)
        except Project.DoesNotExist:
            return Response({'error': 'Associated project not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Find the file to update
        target_file = None
        for file in repository.files:
            if file.file_path == file_path:
                target_file = file
                break
        
        if not target_file:
            return Response({'error': 'File not found'}, status=status.HTTP_404_NOT_FOUND)

        # Capture old path before any update so we can rename on disk
        old_file_path = target_file.file_path

        # Update file properties
        if 'file_name' in request.data:
            target_file.file_name = request.data['file_name']
        if 'file_path' in request.data:
            target_file.file_path = request.data['file_path']
        if 'file_type' in request.data:
            target_file.file_type = request.data['file_type']
        if 'file_size' in request.data:
            target_file.file_size = request.data['file_size']
        if 'content' in request.data:
            target_file.content = request.data['content']
        
        # Update modification tracking
        target_file.last_modified = datetime.utcnow()
        target_file.last_modified_by = user_id
        target_file.last_modified_by_username = user.username
        
        repository.save()

        # Rename the actual file on disk if the path changed
        if repository.root_path and old_file_path != target_file.file_path:
            root = os.path.normpath(repository.root_path)
            old_full_path = os.path.normpath(os.path.join(root, old_file_path))
            new_full_path = os.path.normpath(os.path.join(root, target_file.file_path))
            # Guard against path traversal
            if old_full_path.startswith(root) and new_full_path.startswith(root):
                if os.path.exists(old_full_path):
                    new_dir = os.path.dirname(new_full_path)
                    if new_dir:
                        os.makedirs(new_dir, exist_ok=True)
                    os.rename(old_full_path, new_full_path)
                    # Also move the CRDT state file used by the real-time editor
                    old_ystate = old_full_path + '.ystate'
                    if os.path.exists(old_ystate):
                        os.rename(old_ystate, new_full_path + '.ystate')

        # Return success message
        return Response({
            'message': 'File updated successfully',
            'file': {
                'file_path': target_file.file_path,
                'file_name': target_file.file_name,
                'file_type': target_file.file_type,
                'file_extension': target_file.file_extension,
                'file_size': target_file.file_size,
                'last_modified': target_file.last_modified.isoformat() if target_file.last_modified else None,
                'last_modified_by_username': target_file.last_modified_by_username
            }
        })
        
    except Repository.DoesNotExist:
        return Response({'error': 'Repository not found'}, status=status.HTTP_404_NOT_FOUND)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
def delete_repository_file_view(request, repository_id, file_path):
    """View for deleting repository files"""
    try:
        repository = Repository.objects.get(id=ObjectId(repository_id))
        user_id = ObjectId(request.user.id)
        user = User.objects.get(id=user_id)
        
        # Check if user has access to this repository's project
        try:
            project = Project.objects.get(id=repository.project_id)
            if not (user.role in ['project-manager', 'scrum-master'] or project.is_member(user_id)):
                return Response({'error': 'You do not have permission to delete files from this repository'}, status=status.HTTP_403_FORBIDDEN)
        except Project.DoesNotExist:
            return Response({'error': 'Associated project not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Determine whether this is a folder or single-file deletion.
        # A folder path won't match any individual file exactly; its children
        # are stored as paths like "folder/child.js" in MongoDB.
        folder_prefix = file_path.rstrip('/') + '/'
        files_before = len(repository.files)

        repository.files = [
            f for f in repository.files
            if f.file_path != file_path and not f.file_path.startswith(folder_prefix)
        ]

        if len(repository.files) == files_before:
            return Response({'error': f'File not found: {file_path}'}, status=status.HTTP_404_NOT_FOUND)

        repository.save()

        # Remove the corresponding path(s) from disk
        if repository.root_path:
            root = os.path.normpath(repository.root_path)
            full_path = os.path.normpath(os.path.join(root, file_path))
            # Guard against path traversal
            if full_path.startswith(root):
                if os.path.isdir(full_path):
                    shutil.rmtree(full_path)
                elif os.path.isfile(full_path):
                    os.remove(full_path)
                    # Also remove the CRDT state file used by the real-time editor
                    ystate_path = full_path + '.ystate'
                    if os.path.exists(ystate_path):
                        os.remove(ystate_path)

        # HTTP 204 should not have a response body
        return Response(status=status.HTTP_204_NO_CONTENT)
        
    except Repository.DoesNotExist:
        return Response({'error': 'Repository not found'}, status=status.HTTP_404_NOT_FOUND)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def repository_files_view(request, repository_id):
    """View for getting all files in a repository"""
    try:
        repository = Repository.objects.get(id=ObjectId(repository_id))
        user_id = ObjectId(request.user.id)
        user = User.objects.get(id=user_id)
        
        # Check if user has access to this repository's project
        try:
            project = Project.objects.get(id=repository.project_id)
            if not (user.role in ['project-manager', 'scrum-master'] or project.is_member(user_id)):
                return Response({'error': 'You do not have access to this repository'}, status=status.HTTP_403_FORBIDDEN)
        except Project.DoesNotExist:
            return Response({'error': 'Associated project not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Build a per-file git status map from `git status --porcelain`.
        # Porcelain format: "XY filename" where X=index status, Y=worktree status.
        # This is best-effort — if git isn't available the files still load.
        git_status_map = {}
        if repository.root_path and os.path.exists(repository.root_path):
            try:
                result = subprocess.run(
                    ['git', 'status', '--porcelain'],
                    cwd=repository.root_path,
                    capture_output=True,
                    text=True,
                )
                if result.returncode == 0:
                    for line in result.stdout.splitlines():
                        if not line.strip():
                            continue
                        xy = line[:2]
                        path = line[3:].strip()
                        # Rename lines look like "old -> new"; we want the new path
                        if ' -> ' in path:
                            path = path.split(' -> ')[1]
                        if xy == '??':
                            git_status_map[path] = 'untracked'
                        elif xy[0] == 'A':
                            git_status_map[path] = 'added'
                        elif xy[0] == 'R' or xy[1] == 'R':
                            git_status_map[path] = 'renamed'
                        elif xy[0] == 'D' or xy[1] == 'D':
                            git_status_map[path] = 'deleted'
                        else:
                            git_status_map[path] = 'modified'
            except Exception:
                pass  # Git status is non-critical; files still load without it

        # Return all files, enriched with live git status
        files_data = []
        for file in repository.files:
            file_data = {
                'file_path': file.file_path,
                'file_name': file.file_name,
                'file_type': file.file_type,
                'file_extension': file.file_extension,
                'file_size': file.file_size,
                'content': getattr(file, 'content', ''),
                'last_modified': file.last_modified.isoformat() if file.last_modified else None,
                'last_modified_by': str(file.last_modified_by) if file.last_modified_by else None,
                'last_modified_by_username': file.last_modified_by_username,
                'created_at': file.created_at.isoformat() if file.created_at else None,
                'git_status': git_status_map.get(file.file_path),
            }
            files_data.append(file_data)
        
        return Response({'files': files_data})
        
    except Repository.DoesNotExist:
        return Response({'error': 'Repository not found'}, status=status.HTTP_404_NOT_FOUND)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================================
# FILE MOVE VIEW
# ============================================================================

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def move_repository_file_view(request, repository_id, file_path):
    """Move a file or folder to a new path within the repository"""
    try:
        repository = Repository.objects.get(id=ObjectId(repository_id))
        user_id = ObjectId(request.user.id)
        user = User.objects.get(id=user_id)

        try:
            project = Project.objects.get(id=repository.project_id)
            if not (user.role in ['project-manager', 'scrum-master'] or project.is_member(user_id)):
                return Response({'error': 'You do not have permission to move files'}, status=status.HTTP_403_FORBIDDEN)
        except Project.DoesNotExist:
            return Response({'error': 'Associated project not found'}, status=status.HTTP_404_NOT_FOUND)

        new_path = request.data.get('new_path', '').strip()
        if not new_path:
            return Response({'error': 'new_path is required'}, status=status.HTTP_400_BAD_REQUEST)

        if new_path == file_path:
            return Response({'error': 'Source and destination are the same'}, status=status.HTTP_400_BAD_REQUEST)

        # Prevent moving a folder into one of its own subfolders
        if new_path.startswith(file_path.rstrip('/') + '/'):
            return Response({'error': 'Cannot move a folder into itself'}, status=status.HTTP_400_BAD_REQUEST)

        # Update MongoDB records for both single-file and folder (prefix) moves
        folder_prefix = file_path.rstrip('/') + '/'
        new_folder_prefix = new_path.rstrip('/') + '/'
        files_affected = 0

        for f in repository.files:
            if f.file_path == file_path:
                f.file_path = new_path
                f.file_name = new_path.split('/')[-1]
                files_affected += 1
            elif f.file_path.startswith(folder_prefix):
                relative = f.file_path[len(folder_prefix):]
                f.file_path = new_folder_prefix + relative
                files_affected += 1

        if files_affected == 0:
            return Response({'error': f'File not found: {file_path}'}, status=status.HTTP_404_NOT_FOUND)

        repository.save()

        # Move the actual path(s) on disk
        if repository.root_path:
            root = os.path.normpath(repository.root_path)
            old_full = os.path.normpath(os.path.join(root, file_path))
            new_full = os.path.normpath(os.path.join(root, new_path))
            if old_full.startswith(root) and new_full.startswith(root):
                if os.path.exists(old_full):
                    new_dir = os.path.dirname(new_full)
                    if new_dir:
                        os.makedirs(new_dir, exist_ok=True)
                    shutil.move(old_full, new_full)
                    # Also move the CRDT state file if it exists alongside a file
                    old_ystate = old_full + '.ystate'
                    if os.path.isfile(old_ystate):
                        shutil.move(old_ystate, new_full + '.ystate')

        return Response({'message': 'Moved successfully', 'new_path': new_path})

    except Repository.DoesNotExist:
        return Response({'error': 'Repository not found'}, status=status.HTTP_404_NOT_FOUND)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================================
# PROJECT TEMPLATE VIEWS
# ============================================================================

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

@csrf_exempt
def get_project_templates_view(request):
    """View for getting all available project templates"""
    if request.method != 'GET':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    try:
        category = request.GET.get('category')
        
        if category:
            templates = template_service.get_templates_by_category(category)
        else:
            templates = template_service.get_all_templates()
        
        return JsonResponse({'templates': templates})
        
    except Exception as e:
        import traceback
        return JsonResponse({
            'error': str(e),
            'traceback': traceback.format_exc()
        }, status=500)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def get_template_preview_view(request, template_id):
    """View for getting a preview of a specific template"""
    try:
        variables = {
            'project_name': request.query_params.get('project_name', 'my-project'),
            'project_description': request.query_params.get('project_description', 'My awesome project')
        }
        
        preview = template_service.get_template_preview(template_id, variables)
        
        if not preview:
            return Response({'error': 'Template not found'}, status=status.HTTP_404_NOT_FOUND)
        
        return Response({'preview': preview})
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def create_custom_template_view(request):
    """View for creating custom templates (admin functionality)"""
    try:
        user_id = ObjectId(request.user.id)
        user = User.objects.get(id=user_id)
        
        # Only allow project managers to create templates
        if user.role not in ['project-manager', 'scrum-master']:
            return Response({'error': 'You do not have permission to create templates'}, status=status.HTTP_403_FORBIDDEN)
        
        template_id = request.data.get('template_id')
        template_data = request.data.get('template_data')
        
        if not template_id or not template_data:
            return Response({'error': 'template_id and template_data are required'}, status=status.HTTP_400_BAD_REQUEST)
        
        success = template_service.create_custom_template(template_id, template_data)
        
        if success:
            return Response({'message': 'Template created successfully'}, status=status.HTTP_201_CREATED)
        else:
            return Response({'error': 'Failed to create template'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except ValueError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)