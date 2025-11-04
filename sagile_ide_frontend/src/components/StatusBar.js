import React from 'react';

const StatusBar = ({ selectedTask }) => {
  return (
    <div className="status-bar">
      <div className="status-left">
        <div className="status-indicator">
          <div className="status-dot"></div>
          <span>Connected to Workspace</span>
        </div>
        <span>JavaScript</span>
        <span>UTF-8</span>
        <span>Ln 78, Col 15</span>
        {selectedTask && (
          <div className="status-indicator">
            <i className="fas fa-link"></i>
            <span>Linked to {selectedTask}</span>
          </div>
        )}
      </div>
      
      <div className="status-right">
        <div className="status-indicator">
          <div className="status-dot warning"></div>
          <span>2 warnings</span>
        </div>
        <div className="status-indicator">
          <div className="status-dot"></div>
          <span>0 errors</span>
        </div>
        <span>SAgileIDE v1.0.0</span>
      </div>
    </div>
  );
};

export default StatusBar;
