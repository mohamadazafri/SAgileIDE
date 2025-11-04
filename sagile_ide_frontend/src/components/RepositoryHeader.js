import React from 'react';

const RepositoryHeader = () => {
  return (
    <header className="header">
      <div className="logo">
        <i className="fas fa-code"></i>
        <span>SAgileIDE</span>
      </div>

      <div className="workspace-info">
        <span><i className="fas fa-user-tie"></i> Project Manager Dashboard</span>
      </div>

      <div className="header-actions">
        <div className="user-profile">
          <div className="user-avatar">PM</div>
          <div>
            <div style={{fontSize: '12px'}}>Project Manager</div>
            <div className="role-badge">MANAGER</div>
          </div>
          <i className="fas fa-chevron-down"></i>
        </div>
      </div>
    </header>
  );
};

export default RepositoryHeader;
