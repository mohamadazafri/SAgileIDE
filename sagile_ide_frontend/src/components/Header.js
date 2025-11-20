import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import SettingsModal from './SettingsModal';

const Header = ({ currentRepository, allRepositories = [], onRepositoryChange }) => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [showRepositoryDropdown, setShowRepositoryDropdown] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
  const handleSaveChanges = () => {
    // TODO: Implement save functionality
    console.log('Saving changes...');
  };

  const handleSyncSAgile = () => {
    // TODO: Implement SAgile sync functionality
    console.log('Syncing with SAgile...');
  };

  const handleRepositorySelect = (repository) => {
    onRepositoryChange(repository);
    setShowRepositoryDropdown(false);
  };

  const handleViewAllRepositories = () => {
    navigate('/repositories');
  };

  return (
    <header className="header">
      <div className="logo">
        <i className="fas fa-code"></i>
        <span>SAgileIDE</span>
      </div>
      
      {/* Breadcrumb Navigation */}
      <div className="breadcrumb-nav">
        <button 
          className="breadcrumb-item clickable"
          onClick={handleViewAllRepositories}
        >
          <i className="fas fa-folder-open"></i>
          Repositories
        </button>
        <i className="fas fa-chevron-right breadcrumb-separator"></i>
        {currentRepository && (
          <>
            <span className="breadcrumb-item current">
              {currentRepository.name}
            </span>
            <i className="fas fa-chevron-right breadcrumb-separator"></i>
            <span className="breadcrumb-item current">Workspace</span>
          </>
        )}
      </div>

      {/* Repository Dropdown */}
      {currentRepository && (
        <div className="repository-selector">
          <button 
            className="repository-dropdown-btn"
            onClick={() => setShowRepositoryDropdown(!showRepositoryDropdown)}
          >
            <i className="fas fa-code-branch"></i>
            <span className="repo-name">{currentRepository.name}</span>
            <i className={`fas fa-chevron-${showRepositoryDropdown ? 'up' : 'down'}`}></i>
          </button>
          
          {showRepositoryDropdown && (
            <div className="repository-dropdown">
              <div className="dropdown-header">
                <span>Switch Repository</span>
              </div>
              <div className="dropdown-content">
                {allRepositories.map((repo) => (
                  <button
                    key={repo.id}
                    className={`dropdown-item ${currentRepository.id === repo.id ? 'active' : ''}`}
                    onClick={() => handleRepositorySelect(repo)}
                  >
                    <div className="repo-item">
                      <div className="repo-item-name">{repo.name}</div>
                      <div className="repo-item-desc">{repo.description || 'No description'}</div>
                    </div>
                    {currentRepository.id === repo.id && (
                      <i className="fas fa-check"></i>
                    )}
                  </button>
                ))}
              </div>
              <div className="dropdown-footer">
                <button 
                  className="dropdown-action"
                  onClick={handleViewAllRepositories}
                >
                  <i className="fas fa-th-large"></i>
                  View All Repositories
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className="header-actions">
        {/* Settings Button */}
        <button 
          className="btn btn-outline" 
          onClick={() => setShowSettingsModal(true)}
          title="Editor Settings"
        >
          <i className="fas fa-cog"></i>
        </button>

        {/* Theme Toggle Button */}
        <button 
          className="btn btn-outline" 
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Theme`}
        >
          <i className={`fas fa-${theme === 'dark' ? 'sun' : 'moon'}`}></i>
        </button>

        {/* Header Navigation Button */}
        <button 
          className="btn btn-outline"
          onClick={handleViewAllRepositories}
          title="View All Repositories"
        >
          <i className="fas fa-th-large"></i>
          Repositories
        </button>

        <button className="btn" onClick={handleSaveChanges}>
          <i className="fas fa-save"></i> Save Changes
        </button>
        <button className="btn btn-secondary" onClick={handleSyncSAgile}>
          <i className="fab fa-github"></i> Sync SAgile
        </button>
        
        <div className="user-profile">
          <div className="user-avatar">LT</div>
          <div>
            <div style={{fontSize: '12px'}}>Lisa Tester</div>
            <div className="role-badge">SCRUM MASTER</div>
          </div>
          <i className="fas fa-chevron-down"></i>
        </div>
      </div>
      
      {/* Settings Modal */}
      <SettingsModal 
        isOpen={showSettingsModal} 
        onClose={() => setShowSettingsModal(false)} 
      />
    </header>
  );
};

export default Header;
