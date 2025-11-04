import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { repositoriesAPI } from '../services/api';
import '../styles/RepositoryDashboard.css';

const RepositoryDashboard = () => {
  const navigate = useNavigate();
  const [repositories, setRepositories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRepo, setSelectedRepo] = useState(null);

  useEffect(() => {
    loadRepositories();
  }, []);

  const loadRepositories = async () => {
    try {
      setLoading(true);
      const response = await repositoriesAPI.getMyRepositories();
      // Backend returns {repositories: [...]} format
      const repos = response.repositories || [];
      setRepositories(repos);
    } catch (error) {
      console.error('Error loading repositories:', error);
      setError('Failed to load repositories');
    } finally {
      setLoading(false);
    }
  };

  const handleRepositoryClick = (repo) => {
    setSelectedRepo(repo);
  };

  const handleOpenWorkspace = (repo) => {
    // Navigate to workspace with repository context
    navigate('/workspace', { state: { repository: repo } });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getProjectTypeIcon = (projectType) => {
    const icons = {
      'fresh': 'fas fa-plus-circle',
      'template': 'fas fa-layer-group',
      'upload': 'fas fa-upload'
    };
    return icons[projectType] || 'fas fa-folder';
  };

  const getProjectTypeLabel = (projectType) => {
    const labels = {
      'fresh': 'Fresh Project',
      'template': 'Template Project',
      'upload': 'Uploaded Project'
    };
    return labels[projectType] || 'Unknown';
  };

  if (loading) {
    return (
      <div className="repository-dashboard">
        <div className="dashboard-header">
          <h1 className="dashboard-title">My Repositories</h1>
        </div>
        <div className="loading-container">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Loading repositories...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="repository-dashboard">
        <div className="dashboard-header">
          <h1 className="dashboard-title">My Repositories</h1>
        </div>
        <div className="error-container">
          <i className="fas fa-exclamation-triangle"></i>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={loadRepositories}>
            <i className="fas fa-redo"></i>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="repository-dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-title">My Repositories</h1>
        <p className="dashboard-subtitle">
          Manage and access your development repositories
        </p>
        <div className="dashboard-actions">
          <button 
            className="btn btn-primary"
            onClick={() => navigate('/create-repository')}
          >
            <i className="fas fa-plus"></i>
            Create New Repository
          </button>
        </div>
      </div>

      <div className="dashboard-content">
        {repositories.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-folder-open"></i>
            <h3>No Repositories Yet</h3>
            <p>Create your first repository to start developing with SAgile IDE</p>
            <button 
              className="btn btn-primary"
              onClick={() => navigate('/create-repository')}
            >
              <i className="fas fa-plus"></i>
              Create Repository
            </button>
          </div>
        ) : (
          <div className="repositories-grid">
            {repositories.map((repo) => (
              <div 
                key={repo.id} 
                className={`repository-card ${selectedRepo?.id === repo.id ? 'selected' : ''}`}
                onClick={() => handleRepositoryClick(repo)}
              >
                <div className="repo-header">
                  <div className="repo-info">
                    <h3 className="repo-name">{repo.name}</h3>
                    <p className="repo-description">
                      {repo.description || 'No description provided'}
                    </p>
                  </div>
                  <div className="repo-actions">
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenWorkspace(repo);
                      }}
                    >
                      <i className="fas fa-code"></i>
                      Open
                    </button>
                  </div>
                </div>

                <div className="repo-metadata">
                  <div className="metadata-item">
                    <i className={getProjectTypeIcon(repo.project_type)}></i>
                    <span>{getProjectTypeLabel(repo.project_type)}</span>
                  </div>
                  <div className="metadata-item">
                    <i className="fas fa-project-diagram"></i>
                    <span>{repo.project_sagile_id || 'No project'}</span>
                  </div>
                  <div className="metadata-item">
                    <i className="fas fa-shield-alt"></i>
                    <span className={`access-level ${repo.access_level}`}>
                      {repo.access_level || 'private'}
                    </span>
                  </div>
                </div>

                <div className="repo-stats">
                  <div className="stat-item">
                    <i className="fas fa-file-code"></i>
                    <span>{repo.file_count || 0} files</span>
                  </div>
                  <div className="stat-item">
                    <i className="fas fa-clock"></i>
                    <span>Updated {formatDate(repo.updated_at)}</span>
                  </div>
                </div>

                {repo.template_id && (
                  <div className="repo-template">
                    <i className="fas fa-layer-group"></i>
                    <span>Template: {repo.template_id}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Repository Details Panel */}
      {selectedRepo && (
        <div className="repository-details-panel">
          <div className="details-header">
            <h3>{selectedRepo.name}</h3>
            <button 
              className="btn btn-link"
              onClick={() => setSelectedRepo(null)}
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
          
          <div className="details-content">
            <div className="detail-section">
              <h4>Repository Information</h4>
              <div className="detail-item">
                <strong>Name:</strong> {selectedRepo.name}
              </div>
              <div className="detail-item">
                <strong>Description:</strong> {selectedRepo.description || 'No description'}
              </div>
              <div className="detail-item">
                <strong>Project Type:</strong> {getProjectTypeLabel(selectedRepo.project_type)}
              </div>
              <div className="detail-item">
                <strong>Access Level:</strong> {selectedRepo.access_level}
              </div>
              <div className="detail-item">
                <strong>Created:</strong> {formatDate(selectedRepo.created_at)}
              </div>
              <div className="detail-item">
                <strong>Last Updated:</strong> {formatDate(selectedRepo.updated_at)}
              </div>
            </div>

            {selectedRepo.template_id && (
              <div className="detail-section">
                <h4>Template Information</h4>
                <div className="detail-item">
                  <strong>Template:</strong> {selectedRepo.template_id}
                </div>
              </div>
            )}

            <div className="detail-actions">
              <button 
                className="btn btn-primary"
                onClick={() => handleOpenWorkspace(selectedRepo)}
              >
                <i className="fas fa-code"></i>
                Open in Workspace
              </button>
              <button className="btn btn-secondary">
                <i className="fas fa-cog"></i>
                Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RepositoryDashboard;
