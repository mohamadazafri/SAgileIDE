import pdb
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.db.models import Q
from bson import ObjectId
from .models import Project, ProjectMembership
from users.models import User


# ============================================================================
# PROJECT CRUD VIEWS
# ============================================================================

@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated])
def project_list_view(request):
    """View for listing and creating projects"""
    try:
        user_id = ObjectId(request.user.id)
        user = User.objects.get(id=user_id)
        
        if request.method == 'GET':
            # Users can see projects they're members of or all projects if they're project managers
            if user.role in ['project-manager', 'scrum-master']:
                projects = Project.objects.all()
            else:
                # Filter projects where user is an active member
                projects = Project.objects(members__user_id=user_id, members__is_active=True)
            
            # Manually construct project data
            projects_data = []
            for project in projects:
                project_data = {
                    'id': str(project.id),
                    'sagile_id': project.sagile_id,
                    'name': project.name,
                    'status': project.status,
                    'current_sprint': project.current_sprint,
                    'member_count_display': project.member_count_display,
                    'repository_status': project.get_repository_status(),
                    'created_at': project.created_at.isoformat() if project.created_at else None
                }
                projects_data.append(project_data)
            
            return Response({'projects': projects_data})
            
        elif request.method == 'POST':
            # Create new project
            sagile_id = request.data.get('sagile_id')
            name = request.data.get('name')
            description = request.data.get('description', '')
            status_field = request.data.get('status', 'planning')
            start_date = request.data.get('start_date')
            end_date = request.data.get('end_date')
            current_sprint = request.data.get('current_sprint', 1)
            member_ids = request.data.get('member_ids', [])
            
            # Validate required fields
            if not sagile_id or not name:
                return Response({'error': 'sagile_id and name are required'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate SAgile ID format
            if not sagile_id.startswith('PROJ-'):
                return Response({'error': "SAgile ID must start with 'PROJ-'"}, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if SAgile ID already exists
            if Project.objects(sagile_id=sagile_id).count() > 0:
                return Response({'error': 'SAgile ID already exists'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Create project
            project = Project(
                sagile_id=sagile_id,
                name=name,
                description=description,
                status=status_field,
                start_date=start_date,
                end_date=end_date,
                current_sprint=current_sprint,
                created_by=user_id,
                created_by_username=user.username
            )
            project.save()
            
            # Add members if provided
            for member_id in member_ids:
                try:
                    member_user = User.objects.get(id=ObjectId(member_id))
                    project.add_member(ObjectId(member_id), member_user.username, member_user.role)
                except User.DoesNotExist:
                    continue
            
            # Return created project data
            project_data = {
                'id': str(project.id),
                'sagile_id': project.sagile_id,
                'name': project.name,
                'description': project.description,
                'status': project.status,
                'start_date': project.start_date,
                'end_date': project.end_date,
                'current_sprint': project.current_sprint,
                'created_by': str(project.created_by),
                'created_by_username': project.created_by_username,
                'member_count': len(project.members),
                'created_at': project.created_at.isoformat() if project.created_at else None
            }
            
            return Response(project_data, status=status.HTTP_201_CREATED)
            
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([permissions.IsAuthenticated])
def project_detail_view(request, pk):
    """View for project detail operations"""
    try:
        project = Project.objects.get(id=ObjectId(pk))
        user_id = ObjectId(request.user.id)
        user = User.objects.get(id=user_id)
        
        # Check if user has access to this project
        if not (user.role in ['project-manager', 'scrum-master'] or 
                project.is_member(user_id)):
            return Response({'error': 'You do not have access to this project'}, status=status.HTTP_403_FORBIDDEN)
        
        if request.method == 'GET':
            # Return full project details
            project_data = {
                'id': str(project.id),
                'sagile_id': project.sagile_id,
                'name': project.name,
                'description': project.description,
                'status': project.status,
                'start_date': project.start_date,
                'end_date': project.end_date,
                'current_sprint': project.current_sprint,
                'has_repository': project.has_repository,
                'created_by': str(project.created_by),
                'created_by_username': project.created_by_username,
                'member_count': len(project.members),
                'member_count_display': project.member_count_display,
                'repository_status': project.get_repository_status(),
                'created_at': project.created_at.isoformat() if project.created_at else None,
                'updated_at': project.updated_at.isoformat() if project.updated_at else None,
                'members': [
                    {
                        'user_id': str(member.user_id),
                        'user_username': member.user_username,
                        'role': member.role,
                        'joined_at': member.joined_at.isoformat() if member.joined_at else None,
                        'is_active': member.is_active
                    } for member in project.members
                ]
            }
            return Response(project_data)
            
        elif request.method in ['PUT', 'PATCH']:
            # Update project (only project managers or creators can update)
            if not (user.role in ['project-manager', 'scrum-master'] or 
                    project.created_by == user_id):
                return Response({'error': 'You do not have permission to update this project'}, status=status.HTTP_403_FORBIDDEN)
            
            # Update fields
            if 'name' in request.data:
                project.name = request.data['name']
            if 'description' in request.data:
                project.description = request.data['description']
            if 'status' in request.data:
                project.status = request.data['status']
            if 'start_date' in request.data:
                project.start_date = request.data['start_date']
            if 'end_date' in request.data:
                project.end_date = request.data['end_date']
            if 'current_sprint' in request.data:
                project.current_sprint = request.data['current_sprint']
            
            project.save()
            
            # Return updated project data
            project_data = {
                'id': str(project.id),
                'sagile_id': project.sagile_id,
                'name': project.name,
                'description': project.description,
                'status': project.status,
                'start_date': project.start_date,
                'end_date': project.end_date,
                'current_sprint': project.current_sprint,
                'member_count': len(project.members),
                'updated_at': project.updated_at.isoformat() if project.updated_at else None
            }
            return Response(project_data)
            
        elif request.method == 'DELETE':
            # Delete project (only project managers or creators can delete)
            if not (user.role in ['project-manager', 'scrum-master'] or 
                    project.created_by == user_id):
                return Response({'error': 'You do not have permission to delete this project'}, status=status.HTTP_403_FORBIDDEN)
            
            project.delete()
            return Response({'message': 'Project deleted successfully'}, status=status.HTTP_204_NO_CONTENT)
            
    except Project.DoesNotExist:
        return Response({'error': 'Project not found'}, status=status.HTTP_404_NOT_FOUND)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================================
# PROJECT MEMBERSHIP VIEWS
# ============================================================================

@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated])
def project_membership_view(request, project_id):
    """View for managing project memberships"""
    try:
        project = Project.objects.get(id=ObjectId(project_id))
        user_id = ObjectId(request.user.id)
        user = User.objects.get(id=user_id)
        
        # Check if user has access to this project
        if not (user.role in ['project-manager', 'scrum-master'] or 
                project.is_member(user_id)):
            return Response({'error': 'You do not have access to this project'}, status=status.HTTP_403_FORBIDDEN)
        
        if request.method == 'GET':
            # Return project members
            members_data = []
            for member in project.members:
                member_data = {
                    'user_id': str(member.user_id),
                    'user_username': member.user_username,
                    'role': member.role,
                    'joined_at': member.joined_at.isoformat() if member.joined_at else None,
                    'is_active': member.is_active
                }
                members_data.append(member_data)
            
            return Response({'members': members_data})
            
        elif request.method == 'POST':
            # Add new member (only project managers can add members)
            if not (user.role in ['project-manager', 'scrum-master'] or 
                    project.is_member(user_id)):
                return Response({'error': 'You do not have permission to add members to this project'}, status=status.HTTP_403_FORBIDDEN)
            
            # This functionality is handled by add_project_member_view
            return Response({'error': 'Use the add-member endpoint instead'}, status=status.HTTP_400_BAD_REQUEST)
            
    except Project.DoesNotExist:
        return Response({'error': 'Project not found'}, status=status.HTTP_404_NOT_FOUND)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([permissions.IsAuthenticated])
def project_membership_detail_view(request, project_id, pk):
    """View for individual project membership operations"""
    try:
        project = Project.objects.get(id=ObjectId(project_id))
        user_id = ObjectId(request.user.id)
        user = User.objects.get(id=user_id)
        
        # Check if user has access to this project
        if not (user.role in ['project-manager', 'scrum-master'] or 
                project.is_member(user_id)):
            return Response({'error': 'You do not have access to this project'}, status=status.HTTP_403_FORBIDDEN)
        
        # Find the specific member
        member = None
        for m in project.members:
            if str(m.user_id) == pk:
                member = m
                break
        
        if not member:
            return Response({'error': 'Member not found'}, status=status.HTTP_404_NOT_FOUND)
        
        if request.method == 'GET':
            # Return member details
            member_data = {
                'user_id': str(member.user_id),
                'user_username': member.user_username,
                'role': member.role,
                'joined_at': member.joined_at.isoformat() if member.joined_at else None,
                'is_active': member.is_active
            }
            return Response(member_data)
            
        elif request.method == 'PUT':
            # Update member role (only project managers can update)
            if not (user.role in ['project-manager', 'scrum-master']):
                return Response({'error': 'You do not have permission to update member roles'}, status=status.HTTP_403_FORBIDDEN)
            
            new_role = request.data.get('role')
            if new_role:
                member.role = new_role
                project.save()
            
            member_data = {
                'user_id': str(member.user_id),
                'user_username': member.user_username,
                'role': member.role,
                'joined_at': member.joined_at.isoformat() if member.joined_at else None,
                'is_active': member.is_active
            }
            return Response(member_data)
            
        elif request.method == 'DELETE':
            # Remove member (only project managers can remove)
            if not (user.role in ['project-manager', 'scrum-master']):
                return Response({'error': 'You do not have permission to remove members'}, status=status.HTTP_403_FORBIDDEN)
            
            project.remove_member(ObjectId(pk))
            return Response({'message': 'Member removed successfully'}, status=status.HTTP_204_NO_CONTENT)
            
    except Project.DoesNotExist:
        return Response({'error': 'Project not found'}, status=status.HTTP_404_NOT_FOUND)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================================
# PROJECT SEARCH AND UTILITY VIEWS
# ============================================================================

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def project_search_view(request):
    """View for searching projects"""
    query = request.query_params.get('q', '')
    if not query:
        return Response({'projects': []})
    
    user_id = ObjectId(request.user.id)
    user = User.objects.get(id=user_id)
    
    # Filter projects based on user role
    if user.role in ['project-manager', 'scrum-master']:
        queryset = Project.objects.all()
    else:
        # Only show projects where user is an active member
        queryset = Project.objects(members__user_id=user_id, members__is_active=True)
    
    # Search in project name, description, and SAgile ID
    projects = queryset.filter(
        Q(name__icontains=query) |
        Q(description__icontains=query) |
        Q(sagile_id__icontains=query)
    )[:10]  # Limit to 10 results
    
    # Manually construct project data
    projects_data = []
    for project in projects:
        project_data = {
            'id': str(project.id),
            'sagile_id': project.sagile_id,
            'name': project.name,
            'status': project.status,
            'current_sprint': project.current_sprint,
            'member_count_display': project.member_count_display,
            'repository_status': project.get_repository_status(),
            'created_at': project.created_at.isoformat() if project.created_at else None
        }
        projects_data.append(project_data)
    
    return Response({'projects': projects_data})


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def user_projects_view(request):
    """View for getting current user's projects"""
    user_id = ObjectId(request.user.id)
    projects = Project.objects(members__user_id=user_id, members__is_active=True)
    
    # Manually construct project data to avoid serializer issues
    projects_data = []
    for project in projects:
        project_data = {
            'id': str(project.id),
            'sagile_id': project.sagile_id,
            'name': project.name,
            'status': project.status,
            'current_sprint': project.current_sprint,
            'member_count_display': project.member_count_display,
            'repository_status': project.get_repository_status(),
            'created_at': project.created_at.isoformat() if project.created_at else None
        }
        projects_data.append(project_data)
    
    return Response({'projects': projects_data})


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def add_project_member_view(request, project_id):
    """View for adding a member to a project"""
    try:
        project = Project.objects.get(id=ObjectId(project_id))
        
        # Check if user has permission to add members
        user_id = ObjectId(request.user.id)
        user = User.objects.get(id=user_id)
        
        if not (user.role in ['project-manager', 'scrum-master'] or 
                project.is_member(user_id)):
            return Response(
                {'error': 'You do not have permission to add members to this project'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Validate request data manually
        user_id_to_add = request.data.get('user_id')
        role = request.data.get('role', 'developer')
        
        if not user_id_to_add:
            return Response({'error': 'user_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user_id_to_add = ObjectId(user_id_to_add)
        except:
            return Response({'error': 'Invalid user_id format'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if user exists
        try:
            member_user = User.objects.get(id=user_id_to_add)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Add member to project
        project.add_member(user_id_to_add, member_user.username, role)
        
        # Return success message with basic project info
        return Response({
            'message': 'Member added successfully',
            'project': {
                'id': str(project.id),
                'name': project.name,
                'member_count': len(project.members)
            }
        }, status=status.HTTP_201_CREATED)
        
    except Project.DoesNotExist:
        return Response(
            {'error': 'Project not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
def remove_project_member_view(request, project_id, user_id):
    """View for removing a member from a project"""
    try:
        project = Project.objects.get(id=ObjectId(project_id))
        
        # Check if user has permission to remove members
        current_user_id = ObjectId(request.user.id)
        user = User.objects.get(id=current_user_id)
        
        if not (user.role in ['project-manager', 'scrum-master'] or 
                project.is_member(current_user_id)):
            return Response(
                {'error': 'You do not have permission to remove members from this project'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Remove member from project
        project.remove_member(ObjectId(user_id))
        
        # Return success message with basic project info
        return Response({
            'message': 'Member removed successfully',
            'project': {
                'id': str(project.id),
                'name': project.name,
                'member_count': len(project.members)
            }
        })
        
    except Project.DoesNotExist:
        return Response(
            {'error': 'Project not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)