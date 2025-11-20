import React, { useState, useEffect } from 'react';
import { repositoriesAPI } from '../services/api';

const GitPanel = ({ currentRepository }) => {
  const [gitStatus, setGitStatus] = useState(null);
  const [commitMessage, setCommitMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState(new Set());

  useEffect(() => {
    if (currentRepository?.id) {
      loadGitStatus();
    }
  }, [currentRepository]);

  const loadGitStatus = async () => {
    if (!currentRepository?.id) return;
    
    try {
      setLoading(true);
      setError(null);
      // Mock git status - in real implementation, this would call backend
      setGitStatus({
        branch: 'main',
        ahead: 2,
        behind: 0,
        modified: [
          { path: 'src/App.js', status: 'modified' },
          { path: 'src/components/Header.js', status: 'modified' },
        ],
        staged: [],
        untracked: [
          { path: 'src/components/NewComponent.js', status: 'untracked' }
        ]
      });
    } catch (err) {
      setError('Failed to load git status');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStageFile = (filePath) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(filePath)) {
        newSet.delete(filePath);
      } else {
        newSet.add(filePath);
      }
      return newSet;
    });
  };

  const handleStageAll = () => {
    const allFiles = [
      ...(gitStatus?.modified || []).map(f => f.path),
      ...(gitStatus?.untracked || []).map(f => f.path)
    ];
    setSelectedFiles(new Set(allFiles));
  };

  const handleUnstageAll = () => {
    setSelectedFiles(new Set());
  };

  const handleCommit = async () => {
    if (!commitMessage.trim() || selectedFiles.size === 0) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Mock commit - in real implementation, this would call backend
      console.log('Committing files:', Array.from(selectedFiles), 'with message:', commitMessage);
      
      // Reset state after successful commit
      setCommitMessage('');
      setSelectedFiles(new Set());
      await loadGitStatus();
      
    } catch (err) {
      setError('Failed to commit changes');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!currentRepository) {
    return (
      <div className="git-panel-empty">
        <i className="fab fa-git-alt"></i>
        <p>No repository selected</p>
      </div>
    );
  }

  if (loading && !gitStatus) {
    return (
      <div className="git-panel-loading">
        <i className="fas fa-spinner fa-spin"></i>
        <p>Loading git status...</p>
      </div>
    );
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'modified':
        return <i className="fas fa-edit git-icon-modified"></i>;
      case 'added':
        return <i className="fas fa-plus git-icon-added"></i>;
      case 'deleted':
        return <i className="fas fa-minus git-icon-deleted"></i>;
      case 'untracked':
        return <i className="fas fa-question git-icon-untracked"></i>;
      default:
        return <i className="fas fa-file"></i>;
    }
  };

  const allChanges = [
    ...(gitStatus?.modified || []),
    ...(gitStatus?.untracked || [])
  ];

  return (
    <div className="git-panel">
      {/* Git Branch Info */}
      <div className="git-branch-info">
        <div className="git-branch">
          <i className="fas fa-code-branch"></i>
          <span>{gitStatus?.branch || 'main'}</span>
        </div>
        {gitStatus && (gitStatus.ahead > 0 || gitStatus.behind > 0) && (
          <div className="git-sync-info">
            {gitStatus.ahead > 0 && (
              <span className="git-ahead" title="Commits ahead">
                <i className="fas fa-arrow-up"></i> {gitStatus.ahead}
              </span>
            )}
            {gitStatus.behind > 0 && (
              <span className="git-behind" title="Commits behind">
                <i className="fas fa-arrow-down"></i> {gitStatus.behind}
              </span>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="git-error">
          <i className="fas fa-exclamation-triangle"></i>
          {error}
        </div>
      )}

      {/* Changes List */}
      <div className="git-changes-section">
        <div className="git-section-header">
          <h3>
            <i className="fas fa-list"></i>
            Changes ({allChanges.length})
          </h3>
          <div className="git-section-actions">
            <button 
              className="git-action-btn"
              onClick={handleStageAll}
              disabled={allChanges.length === 0}
              title="Stage All"
            >
              <i className="fas fa-plus"></i>
            </button>
            <button 
              className="git-action-btn"
              onClick={handleUnstageAll}
              disabled={selectedFiles.size === 0}
              title="Unstage All"
            >
              <i className="fas fa-minus"></i>
            </button>
            <button 
              className="git-action-btn"
              onClick={loadGitStatus}
              disabled={loading}
              title="Refresh"
            >
              <i className={`fas fa-sync ${loading ? 'fa-spin' : ''}`}></i>
            </button>
          </div>
        </div>

        {allChanges.length === 0 ? (
          <div className="git-no-changes">
            <i className="fas fa-check-circle"></i>
            <p>No changes</p>
          </div>
        ) : (
          <ul className="git-changes-list">
            {allChanges.map((file) => (
              <li 
                key={file.path}
                className={`git-change-item ${selectedFiles.has(file.path) ? 'staged' : ''}`}
                onClick={() => handleStageFile(file.path)}
              >
                <input
                  type="checkbox"
                  checked={selectedFiles.has(file.path)}
                  onChange={() => {}}
                  className="git-file-checkbox"
                />
                {getStatusIcon(file.status)}
                <span className="git-file-path">{file.path}</span>
                <span className={`git-file-status git-status-${file.status}`}>
                  {file.status[0].toUpperCase()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Commit Section */}
      <div className="git-commit-section">
        <textarea
          className="git-commit-message"
          placeholder="Commit message..."
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          disabled={loading || selectedFiles.size === 0}
          rows={3}
        />
        <button
          className="git-commit-btn"
          onClick={handleCommit}
          disabled={loading || !commitMessage.trim() || selectedFiles.size === 0}
        >
          <i className="fas fa-check"></i>
          Commit {selectedFiles.size > 0 && `(${selectedFiles.size})`}
        </button>
      </div>

      {/* Git Actions */}
      <div className="git-actions">
        <button className="git-action-btn-block" disabled={loading}>
          <i className="fas fa-arrow-up"></i>
          Push
        </button>
        <button className="git-action-btn-block" disabled={loading}>
          <i className="fas fa-arrow-down"></i>
          Pull
        </button>
      </div>
    </div>
  );
};

export default GitPanel;

