import React from 'react';
import FileExplorer from './FileExplorer';
import TasksPanel from './TasksPanel';

const LeftPanel = ({ activePanel, selectedTask, onTaskSelect, selectedCode, currentRepository, onFileSelect, selectedFile, refreshTrigger }) => {
  return (
    <aside className="left-panel">
      {activePanel === 'files' && (
        <FileExplorer 
          currentRepository={currentRepository}
          onFileSelect={onFileSelect}
          selectedFile={selectedFile}
          refreshTrigger={refreshTrigger}
        />
      )}
      {activePanel === 'tasks' && (
        <TasksPanel 
          selectedTask={selectedTask}
          onTaskSelect={onTaskSelect}
          selectedCode={selectedCode}
        />
      )}
      {activePanel === 'search' && (
        <div className="panel-section">
          <div className="panel-header">
            <span><i className="fas fa-search"></i> SEARCH</span>
          </div>
          <div className="panel-content">
            <p>Search functionality coming soon...</p>
          </div>
        </div>
      )}
      {activePanel === 'team' && (
        <div className="panel-section">
          <div className="panel-header">
            <span><i className="fas fa-users"></i> TEAM</span>
          </div>
          <div className="panel-content">
            <p>Team management coming soon...</p>
          </div>
        </div>
      )}
      {activePanel === 'version' && (
        <div className="panel-section">
          <div className="panel-header">
            <span><i className="fas fa-code-branch"></i> VERSION CONTROL</span>
          </div>
          <div className="panel-content">
            <p>Version control coming soon...</p>
          </div>
        </div>
      )}
      {activePanel === 'settings' && (
        <div className="panel-section">
          <div className="panel-header">
            <span><i className="fas fa-cog"></i> SETTINGS</span>
          </div>
          <div className="panel-content">
            <p>Settings coming soon...</p>
          </div>
        </div>
      )}
    </aside>
  );
};

export default LeftPanel;
