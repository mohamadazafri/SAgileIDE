import React, { useState, useEffect } from 'react';
import { projectsAPI } from '../services/api';

const AccessControl = ({ onAccessChange, selectedProject }) => {
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [accessLevel, setAccessLevel] = useState('private');

  // Fetch team members from backend when project is selected
  useEffect(() => {
    if (selectedProject) {
      fetchTeamMembers();
    }
  }, [selectedProject]);

  const fetchTeamMembers = async () => {
    if (!selectedProject) return;
    
    try {
      setLoading(true);
      const response = await projectsAPI.getProjectMembers(selectedProject.id);
      
      // Extract members array from response object
      const data = response.members || [];
      
      // Transform backend data to frontend format
      const members = data.map(member => ({
        id: member.user_id,
        name: member.user_username,
        role: member.role_display || member.role,
        icon: getRoleIcon(member.role),
        avatar: getInitials(member.user_username),
        color: getRoleColor(member.role),
        hasAccess: true, // Default to true for now
        disabled: member.role === 'project-manager' || member.role === 'scrum-master'
      }));
      
      setTeamMembers(members);
    } catch (error) {
      console.error('Error fetching team members:', error);
      // Fallback to mock data
      setTeamMembers([
    {
      id: 'pm',
      name: 'You (Project Manager)',
      role: 'Project Manager',
      icon: 'fas fa-user-tie',
      avatar: 'PM',
      color: 'var(--success)',
      hasAccess: true,
          disabled: true
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role) => {
    const icons = {
      'project-manager': 'fas fa-user-tie',
      'scrum-master': 'fas fa-users-cog',
      'developer': 'fas fa-code',
      'tester': 'fas fa-bug',
      'product-owner': 'fas fa-user-check'
    };
    return icons[role] || 'fas fa-user';
  };

  const getRoleColor = (role) => {
    const colors = {
      'project-manager': 'var(--success)',
      'scrum-master': 'var(--purple)',
      'developer': 'var(--info)',
      'tester': 'var(--warning)',
      'product-owner': 'var(--primary)'
    };
    return colors[role] || 'var(--secondary)';
  };

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleAccessChange = (memberId, hasAccess) => {
    setTeamMembers(prev => 
      prev.map(member => 
        member.id === memberId ? { ...member, hasAccess } : member
      )
    );
  };

  const handleAccessLevelChange = (level) => {
    setAccessLevel(level);
  };

  const countMembersWithAccess = () => {
    return teamMembers.filter(member => member.hasAccess).length;
  };

  const totalMembers = teamMembers.length;

  useEffect(() => {
    onAccessChange({
      accessLevel,
      totalMembers,
      membersWithAccess: countMembersWithAccess(),
      teamMembers: teamMembers.filter(member => member.hasAccess)
    });
  }, [teamMembers, accessLevel, onAccessChange]);

  if (!selectedProject) {
    return (
      <div className="access-control">
        <div className="access-control-title">
          <i className="fas fa-shield-alt"></i>
          Access Control
        </div>
        <div className="no-project-message">
          <i className="fas fa-info-circle"></i>
          <p>Please select a project first to configure access control.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="access-control">
        <div className="access-control-title">
          <i className="fas fa-shield-alt"></i>
          Access Control
        </div>
        <div className="loading-message">
          <i className="fas fa-spinner fa-spin"></i>
          Loading team members...
        </div>
      </div>
    );
  }

  return (
    <div className="access-control">
      <div className="access-control-title">
        <i className="fas fa-shield-alt"></i>
        Access Control
      </div>

      {/* Repository Access Level */}
      <div className="access-level-section">
        <label className="access-level-label">Repository Access Level:</label>
        <div className="access-level-options">
          <label className="access-level-option">
            <input
              type="radio"
              name="accessLevel"
              value="private"
              checked={accessLevel === 'private'}
              onChange={(e) => handleAccessLevelChange(e.target.value)}
            />
            <span className="option-label">
              <i className="fas fa-lock"></i>
              Private (Team members only)
            </span>
          </label>
          <label className="access-level-option">
            <input
              type="radio"
              name="accessLevel"
              value="internal"
              checked={accessLevel === 'internal'}
              onChange={(e) => handleAccessLevelChange(e.target.value)}
            />
            <span className="option-label">
              <i className="fas fa-users"></i>
              Internal (Organization members)
            </span>
          </label>
          <label className="access-level-option">
            <input
              type="radio"
              name="accessLevel"
              value="public"
              checked={accessLevel === 'public'}
              onChange={(e) => handleAccessLevelChange(e.target.value)}
            />
            <span className="option-label">
              <i className="fas fa-globe"></i>
              Public (Everyone)
            </span>
          </label>
        </div>
      </div>

      {/* Team Members */}
      <div className="team-members-section">
        <div className="team-members-title">Team Members:</div>
      {teamMembers.map(member => (
        <div key={member.id} className="team-member">
          <div className="member-info">
            <div 
              className="member-avatar"
              style={{ backgroundColor: member.color }}
            >
              {member.avatar}
            </div>
            <div className="member-details">
              <div className="member-name">{member.name}</div>
              <div className="member-role">
                <i className={member.icon}></i>
                {member.role}
              </div>
            </div>
          </div>
          <div className="permission-controls">
            {!member.disabled && (
              <input 
                type="checkbox" 
                className="access-checkbox"
                checked={member.hasAccess}
                onChange={(e) => handleAccessChange(member.id, e.target.checked)}
              />
            )}
            {member.disabled && (
              <div className="permission-level full-access">
                Full Access
              </div>
            )}
          </div>
        </div>
      ))}
      </div>

      <div className="access-summary">
        <div className="summary-item">
          <span className="summary-label">Total Team Members:</span>
          <span className="summary-value">{totalMembers} members</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Repository Access:</span>
          <span className="summary-value">{countMembersWithAccess()} members granted</span>
        </div>
      </div>
    </div>
  );
};

export default AccessControl;
