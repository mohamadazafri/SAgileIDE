import React from 'react';

const RepositoryPreview = ({ 
  isVisible, 
  repositoryName, 
  selectedProject, 
  accessInfo,
  projectType,
  uploadedFiles,
  selectedTemplate
}) => {
  if (!isVisible) return null;

  const generateRepositoryUrl = (name) => {
    return `https://sagile-ide.com/repos/${name}`;
  };

  return (
    <section className="repository-preview show">
      <h2 className="section-title">
        <i className="fas fa-eye"></i>
        Repository Preview
      </h2>

      <div className="preview-item">
        <span className="preview-label">Repository Name:</span>
        <span className="preview-value">{repositoryName || '-'}</span>
      </div>
      
      <div className="preview-item">
        <span className="preview-label">Linked SAgile Project:</span>
        <span className="preview-value">{selectedProject?.name || '-'}</span>
      </div>
      
      <div className="preview-item">
        <span className="preview-label">Repository URL:</span>
        <span className="preview-value">
          {repositoryName ? generateRepositoryUrl(repositoryName) : '-'}
        </span>
      </div>
      
      <div className="preview-item">
        <span className="preview-label">Access Control:</span>
        <span className="preview-value">Inherited from SAgile Project</span>
      </div>
      
      <div className="preview-item">
        <span className="preview-label">Auto-save:</span>
        <span className="preview-value">Enabled</span>
      </div>
      
      <div className="preview-item">
        <span className="preview-label">Project Type:</span>
        <span className="preview-value">
          {projectType === 'fresh' ? 'Fresh Project' : 'Uploaded Project'}
        </span>
      </div>
      
      {projectType === 'upload' && uploadedFiles.length > 0 && (
        <div className="preview-item">
          <span className="preview-label">Uploaded Files:</span>
          <span className="preview-value">{uploadedFiles.length} files</span>
        </div>
      )}
      
      {projectType === 'fresh' && selectedTemplate && (
        <div className="preview-item">
          <span className="preview-label">Template:</span>
          <span className="preview-value">{selectedTemplate.name}</span>
        </div>
      )}
      
      <div className="preview-item">
        <span className="preview-label">Team Access:</span>
        <span className="preview-value">
          {accessInfo ? `${accessInfo.membersWithAccess} members with repository access` : '-'}
        </span>
      </div>
    </section>
  );
};

export default RepositoryPreview;
