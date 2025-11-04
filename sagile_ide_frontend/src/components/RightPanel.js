import React from 'react';

const RightPanel = () => {
  const teamActivity = [
    {
      user: 'Sarah',
      initials: 'SM',
      action: 'updated task progress',
      details: 'PROJ-124 → In Progress',
      time: '2m ago',
      color: 'var(--success)'
    },
    {
      user: 'Mike',
      initials: 'MD',
      action: 'is editing collaboratively',
      details: 'UserAuth.jsx',
      time: '5m ago',
      color: 'var(--purple)'
    },
    {
      user: 'Lisa',
      initials: 'LT',
      action: 'linked code to task',
      details: 'PROJ-125 ↔ payment.js',
      time: '15m ago',
      color: 'var(--orange)'
    },
    {
      user: 'John',
      initials: 'JD',
      action: 'saved changes',
      details: 'index.js',
      time: '1h ago',
      color: 'var(--info)'
    },
    {
      user: 'Sarah',
      initials: 'SM',
      action: 'approved code review',
      details: 'PROJ-122 → Done',
      time: '2h ago',
      color: 'var(--success)'
    },
    {
      user: 'Mike',
      initials: 'MD',
      action: 'created new file',
      details: 'components/Payment.jsx',
      time: '3h ago',
      color: 'var(--purple)'
    }
  ];

  const onlineMembers = [
    {
      name: 'Lisa Tester',
      initials: 'LT',
      role: 'SM',
      status: 'Managing tasks',
      statusColor: 'var(--success)',
      color: 'var(--orange)',
      isCurrentUser: true
    },
    {
      name: 'Sarah Manager',
      initials: 'SM',
      role: 'PM',
      status: 'Reviewing tasks',
      statusColor: 'var(--warning)',
      color: 'var(--success)',
      isCurrentUser: false
    },
    {
      name: 'Mike Developer',
      initials: 'MD',
      role: 'DEV',
      status: 'Editing UserAuth.jsx',
      statusColor: 'var(--success)',
      color: 'var(--purple)',
      isCurrentUser: false
    },
    {
      name: 'John Developer',
      initials: 'JD',
      role: 'DEV',
      status: 'Idle',
      statusColor: 'var(--text-secondary)',
      color: 'var(--info)',
      isCurrentUser: false
    }
  ];

  return (
    <aside className="right-panel">
      {/* Sprint Progress Section */}
      <div className="panel-header">
        <span><i className="fas fa-chart-line"></i> SPRINT PROGRESS</span>
      </div>
      
      <div className="progress-section">
        <div className="progress-item">
          <span>Sprint 3 Progress</span>
          <div className="progress-bar">
            <div className="progress-fill" style={{width: '65%'}}></div>
          </div>
          <span>65%</span>
        </div>
        <div className="progress-item">
          <span>Tasks Completed</span>
          <span>8/12</span>
        </div>
        <div className="progress-item">
          <span>Code Coverage</span>
          <div className="progress-bar">
            <div className="progress-fill" style={{width: '78%'}}></div>
          </div>
          <span>78%</span>
        </div>
        <div className="progress-item">
          <span>Days Remaining</span>
          <span>3 days</span>
        </div>
      </div>

      {/* Team Activity Section */}
      <div className="panel-header">
        <span><i className="fas fa-history"></i> TEAM ACTIVITY</span>
      </div>
      
      <div className="panel-content" style={{maxHeight: '300px'}}>
        {teamActivity.map((activity, index) => (
          <div key={index} className="activity-item">
            <div 
              className="activity-avatar" 
              style={{backgroundColor: activity.color}}
            >
              {activity.initials}
            </div>
            <div className="activity-text">
              <strong>{activity.user}</strong> {activity.action}
              <div style={{color: 'var(--text-secondary)', fontSize: '10px'}}>
                {activity.details}
              </div>
            </div>
            <div className="activity-time">{activity.time}</div>
          </div>
        ))}
      </div>

      {/* Real-time Presence Section */}
      <div className="panel-header">
        <span><i className="fas fa-users"></i> ONLINE MEMBERS</span>
      </div>
      
      <div className="panel-content">
        {onlineMembers.map((member, index) => (
          <div key={index} className="activity-item">
            <div 
              className="activity-avatar" 
              style={{backgroundColor: member.color}}
            >
              {member.initials}
            </div>
            <div className="activity-text">
              <strong>{member.name}</strong> {member.isCurrentUser && '(You)'}
              <div style={{color: member.statusColor, fontSize: '10px'}}>
                ● {member.status}
              </div>
            </div>
            <div className="role-badge">{member.role}</div>
          </div>
        ))}
      </div>
    </aside>
  );
};

export default RightPanel;
