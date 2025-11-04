import React, { useState } from 'react';

const TasksPanel = ({ selectedTask, onTaskSelect, selectedCode }) => {
  const [activeFilter, setActiveFilter] = useState('all');

  const tasks = [
    {
      id: 'PROJ-123',
      title: 'Implement user authentication system',
      description: 'Add OAuth integration with GitHub for user login and session management',
      status: 'in-progress',
      assignee: 'Mike Developer',
      progress: 75,
      lastUpdated: '2h ago',
      codeLinks: 2,
      hasLinks: true
    },
    {
      id: 'PROJ-124',
      title: 'Add product search functionality',
      description: 'Implement search with filters for product categories and price ranges',
      status: 'todo',
      assignee: 'Sarah Manager',
      progress: 0,
      lastUpdated: 'Not started',
      codeLinks: 0,
      hasLinks: false
    },
    {
      id: 'PROJ-122',
      title: 'Setup project repository structure',
      description: 'Create initial folder structure and configure development environment',
      status: 'done',
      assignee: 'Lisa Tester',
      progress: 100,
      lastUpdated: 'Completed',
      codeLinks: 5,
      hasLinks: true
    },
    {
      id: 'PROJ-125',
      title: 'Payment gateway integration',
      description: 'Integrate Stripe payment processing with order management',
      status: 'code-review',
      assignee: 'John Developer',
      progress: 85,
      lastUpdated: '1h ago',
      codeLinks: 3,
      hasLinks: true
    },
    {
      id: 'PROJ-126',
      title: 'Database migration for user profiles',
      description: 'Migrate existing user data to new profile schema',
      status: 'blocked',
      assignee: 'Mike Developer',
      progress: 20,
      lastUpdated: 'Blocked 3h ago',
      codeLinks: 0,
      hasLinks: false
    }
  ];

  const filteredTasks = tasks.filter(task => 
    activeFilter === 'all' || task.status === activeFilter
  );

  const handleLinkCodeToTask = () => {
    if (selectedCode && selectedTask) {
      console.log(`Linking code to task ${selectedTask}:`, selectedCode);
      // TODO: Implement code linking functionality
    }
  };

  const handleUpdateProgress = () => {
    console.log('Opening progress update dialog...');
    // TODO: Implement progress update dialog
  };

  const getStatusColor = (status) => {
    const colors = {
      'todo': 'var(--text-secondary)',
      'in-progress': 'var(--warning)',
      'code-review': 'var(--purple)',
      'testing': 'var(--orange)',
      'done': 'var(--success)',
      'blocked': 'var(--error)'
    };
    return colors[status] || 'var(--text-secondary)';
  };

  const getStatusText = (status) => {
    const texts = {
      'todo': 'To Do',
      'in-progress': 'In Progress',
      'code-review': 'Code Review',
      'testing': 'Testing',
      'done': 'Done',
      'blocked': 'Blocked'
    };
    return texts[status] || status;
  };

  return (
    <div className="panel-section">
      <div className="panel-header">
        <span><i className="fas fa-tasks"></i> ASSIGNED TASKS</span>
        <div className="panel-actions">
          <button className="panel-action-btn" title="Sync with SAgile">
            <i className="fas fa-sync"></i>
          </button>
          <button className="panel-action-btn" title="Filter">
            <i className="fas fa-filter"></i>
          </button>
        </div>
      </div>
      
      <div className="panel-content">
        {/* Update Progress Button (Scrum Master Only) */}
        <button 
          className="update-progress-btn scrum-master-only" 
          onClick={handleUpdateProgress}
          disabled={!selectedTask}
        >
          <i className="fas fa-chart-line"></i>
          Update Task Progress
        </button>

        {/* Link Code to Task Button */}
        <button 
          className="link-code-btn" 
          onClick={handleLinkCodeToTask}
          disabled={!selectedCode || !selectedTask}
        >
          <i className="fas fa-link"></i>
          Link Selected Code to Task
        </button>

        {/* Code Selection Helper */}
        {!selectedCode && (
          <div className="code-selection-helper">
            <div className="helper-icon">
              <i className="fas fa-mouse-pointer"></i>
            </div>
            <div className="helper-text">
              Select code in the editor to link it to a task
            </div>
            <div className="helper-steps">
              1. Highlight code → 2. Choose task → 3. Link
            </div>
          </div>
        )}

        <div className="task-filter">
          <button 
            className={`filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            All
          </button>
          <button 
            className={`filter-btn ${activeFilter === 'todo' ? 'active' : ''}`}
            onClick={() => setActiveFilter('todo')}
          >
            To Do
          </button>
          <button 
            className={`filter-btn ${activeFilter === 'in-progress' ? 'active' : ''}`}
            onClick={() => setActiveFilter('in-progress')}
          >
            In Progress
          </button>
          <button 
            className={`filter-btn ${activeFilter === 'done' ? 'active' : ''}`}
            onClick={() => setActiveFilter('done')}
          >
            Done
          </button>
        </div>

        {filteredTasks.map(task => (
          <div 
            key={task.id}
            className={`task-item ${selectedTask === task.id ? 'selected' : ''}`}
            onClick={() => onTaskSelect(task.id)}
          >
            <div className="task-header">
              <span className="task-id">{task.id}</span>
              <span className={`task-status ${task.status}`}>
                {getStatusText(task.status)}
              </span>
            </div>
            <div className="task-title">{task.title}</div>
            <p style={{fontSize: '11px', margin: '5px 0', color: 'var(--text-secondary)'}}>
              {task.description}
            </p>
            <div className="task-assignee">
              <i className="fas fa-user"></i> 
              {task.status === 'done' ? 'Completed by' : 'Assigned to'}: {task.assignee}
            </div>
            <div className={`task-link-indicator ${task.hasLinks ? 'has-links' : 'no-links'}`}>
              <i className="fas fa-code"></i>
              <span>{task.hasLinks ? 'Code linked' : 'No code linked'}</span>
              {task.hasLinks && <span className="link-count">{task.codeLinks}</span>}
            </div>
            <div className="task-progress-indicator">
              <i className="fas fa-chart-line"></i>
              <span>Progress:</span>
              <span className="progress-percentage">{task.progress}%</span>
              <span className="last-updated">{task.lastUpdated}</span>
            </div>
            <div className="task-actions">
              {task.status === 'todo' && (
                <>
                  <button className="task-action-btn">
                    <i className="fas fa-play"></i> Start Task
                  </button>
                  <button className="task-action-btn">
                    <i className="fas fa-eye"></i> View Details
                  </button>
                </>
              )}
              {task.status === 'in-progress' && (
                <>
                  <button className="task-action-btn">
                    <i className="fas fa-check"></i> Approve
                  </button>
                  <button className="task-action-btn">
                    <i className="fas fa-comment"></i> Add Comment
                  </button>
                </>
              )}
              {task.status === 'code-review' && (
                <>
                  <button className="task-action-btn">
                    <i className="fas fa-eye"></i> Review Code
                  </button>
                  <button className="task-action-btn">
                    <i className="fas fa-comment"></i> Add Comment
                  </button>
                </>
              )}
              {task.status === 'blocked' && (
                <button className="task-action-btn">
                  <i className="fas fa-exclamation-triangle"></i> View Blocker
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TasksPanel;
