import React from 'react';

const Sidebar = ({ activePanel, onPanelSwitch }) => {
  const sidebarItems = [
    { id: 'files', icon: 'fas fa-folder', title: 'File Explorer' },
    { id: 'search', icon: 'fas fa-search', title: 'Search' },
    { id: 'tasks', icon: 'fas fa-tasks', title: 'Tasks', notificationCount: 3 },
    { id: 'team', icon: 'fas fa-users', title: 'Team Activity' },
    { id: 'version', icon: 'fas fa-code-branch', title: 'Version Control' },
    { id: 'settings', icon: 'fas fa-cog', title: 'Settings' }
  ];

  return (
    <nav className="sidebar">
      {sidebarItems.map(item => (
        <div 
          key={item.id}
          className={`sidebar-item ${activePanel === item.id ? 'active' : ''}`}
          title={item.title}
          onClick={() => onPanelSwitch(item.id)}
        >
          <i className={item.icon}></i>
          {item.notificationCount && (
            <div className="notification-badge">{item.notificationCount}</div>
          )}
        </div>
      ))}
    </nav>
  );
};

export default Sidebar;
