import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/RepositoryCreation.css';
import ProjectSelection from './ProjectSelection';
import ProjectInitialization from './ProjectInitialization';
import AccessControl from './AccessControl';
import RepositoryPreview from './RepositoryPreview';
import { repositoriesAPI } from '../services/api';

const RepositoryCreation = () => {
  const navigate = useNavigate();
  
  // Form state
  const [repositoryName, setRepositoryName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedProject, setSelectedProject] = useState(null);
  const [accessInfo, setAccessInfo] = useState(null);
  
  // Project initialization state
  const [projectType, setProjectType] = useState('fresh');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateVariables, setTemplateVariables] = useState({
    project_name: '',
    author: '',
    description: ''
  });
  const [showTemplateVariables, setShowTemplateVariables] = useState(false);
  
  // UI state
  const [showPreview, setShowPreview] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [errors, setErrors] = useState({});

  // Validation
  const validateRepositoryName = (name) => {
    const trimmedName = name.trim();
    
    if (!trimmedName) {
      return "Repository name is required";
    }
    
    if (!/^[a-z0-9-]+$/.test(trimmedName)) {
      return "Only lowercase letters, numbers, and hyphens allowed";
    }
    
    if (trimmedName.length < 3) {
      return "Repository name must be at least 3 characters";
    }
    
    return null;
  };

  const handleRepositoryNameChange = (e) => {
    const name = e.target.value;
    setRepositoryName(name);
    
    const error = validateRepositoryName(name);
    setErrors(prev => ({
      ...prev,
      repositoryName: error
    }));
  };

  const handlePreview = () => {
    const nameError = validateRepositoryName(repositoryName);
    
    if (nameError) {
      setErrors(prev => ({
        ...prev,
        repositoryName: nameError
      }));
      return;
    }
    
    if (!selectedProject) {
      alert("Please select a SAgile project first");
      return;
    }
    
    setShowPreview(true);
  };

  const handleCreateRepository = async () => {
    const nameError = validateRepositoryName(repositoryName);
    
    if (nameError) {
      setErrors(prev => ({
        ...prev,
        repositoryName: nameError
      }));
      return;
    }
    
    if (!selectedProject) {
      alert("Please select a SAgile project first");
      return;
    }
    
    setIsCreating(true);
    setErrors({});
    
    try {
      const repositoryData = {
        name: repositoryName.trim(),
        description: description.trim(),
        project_id: selectedProject.id,
        access_level: accessInfo?.accessLevel || 'private',
        project_type: projectType
      };
      
      // Add template data if template is selected
      if (selectedTemplate && projectType === 'fresh') {
        repositoryData.project_type = 'template';
        repositoryData.template_id = selectedTemplate.id;
        repositoryData.template_variables = {
          project_name: templateVariables.project_name || repositoryName.trim(),
          author: templateVariables.author || 'User',
          description: templateVariables.description || description.trim() || `A ${selectedTemplate.name} project`
        };
      }
      
      const createdRepository = await repositoriesAPI.createRepository(repositoryData);
      
      setShowSuccess(true);
      setIsCreating(false);
      
      // Scroll to top to show success message
      window.scrollTo({ top: 0, behavior: "smooth" });
      
      // Show options after a delay
      setTimeout(() => {
        const choice = window.confirm("Repository created successfully! Would you like to view your repositories or go to workspace?\n\nOK = View Repositories\nCancel = Go to Workspace");
        if (choice) {
          navigate('/repositories');
        } else {
          navigate('/workspace');
        }
      }, 1000);
      
    } catch (error) {
      console.error('Error creating repository:', error);
      setErrors(prev => ({
        ...prev,
        general: error.message
      }));
      setIsCreating(false);
    }
  };

  const handleProjectTypeChange = (type) => {
    setProjectType(type);
    if (type === 'fresh') {
      setUploadedFiles([]);
    }
  };

  const handleFilesUploaded = (files) => {
    setUploadedFiles(files);
  };

  const handleReset = () => {
    setRepositoryName('');
    setDescription('');
    setSelectedProject(null);
    setAccessInfo(null);
    setProjectType('fresh');
    setUploadedFiles([]);
    setSelectedTemplate(null);
    setTemplateVariables({
      project_name: '',
      author: '',
      description: ''
    });
    setShowPreview(false);
    setShowSuccess(false);
    setErrors({});
  };

  const handleTemplateVariableChange = (key, value) => {
    setTemplateVariables(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className="repository-creation-page">
      <main className="main-content">
        {/* Dashboard Header */}
        <div className="dashboard-header">
          <h1 className="dashboard-title">Create New Repository</h1>
          <p className="dashboard-subtitle">
            UC-001: Establish a development workspace for your SAgile project
          </p>
        </div>

        {/* Success Message */}
        {showSuccess && (
          <div className="success-message show">
            <i className="fas fa-check-circle"></i>
            <span>Repository created successfully and linked to SAgile project!</span>
          </div>
        )}

        {/* Error Message */}
        {errors.general && (
          <div className="error-message show">
            <i className="fas fa-exclamation-circle"></i>
            <span>{errors.general}</span>
          </div>
        )}

        {/* Project Selection */}
        <ProjectSelection 
          selectedProject={selectedProject}
          onProjectChange={setSelectedProject}
        />

        {/* Project Initialization */}
        <ProjectInitialization 
          onProjectTypeChange={handleProjectTypeChange}
          onFilesUploaded={handleFilesUploaded}
          onTemplateSelected={setSelectedTemplate}
          selectedTemplate={selectedTemplate}
          templateVariables={templateVariables}
          onTemplateVariableChange={handleTemplateVariableChange}
          repositoryName={repositoryName}
          showTemplateVariables={showTemplateVariables}
          onToggleTemplateVariables={setShowTemplateVariables}
        />

        {/* Repository Creation Form */}
        <section className="repository-creation">
          <h2 className="section-title">
            <i className="fas fa-folder-plus"></i>
            Repository Configuration
          </h2>

          <form>
            <div className="form-group">
              <label className="form-label" htmlFor="repositoryName">
                Repository Name <span style={{color: 'var(--error)'}}>*</span>
              </label>
              <input
                type="text"
                id="repositoryName"
                className={`form-input ${errors.repositoryName ? 'error' : ''}`}
                placeholder="e.g., ecommerce-platform"
                value={repositoryName}
                onChange={handleRepositoryNameChange}
                required
              />
              {errors.repositoryName && (
                <div className="error-message">{errors.repositoryName}</div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="repositoryDescription">
                Description (Optional)
              </label>
              <textarea
                id="repositoryDescription"
                className="form-input form-textarea"
                placeholder="Brief description of the project and its purpose..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Access Control */}
            <AccessControl 
              onAccessChange={setAccessInfo} 
              selectedProject={selectedProject}
            />
          </form>
        </section>


        {/* Repository Preview */}
        <RepositoryPreview 
          isVisible={showPreview}
          repositoryName={repositoryName}
          selectedProject={selectedProject}
          accessInfo={accessInfo}
          projectType={projectType}
          uploadedFiles={uploadedFiles}
          selectedTemplate={selectedTemplate}
        />

        {/* Action Buttons */}
        <div className="action-buttons">
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={handleReset}
          >
            <i className="fas fa-undo"></i>
            Reset Form
          </button>
          
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handlePreview}
          >
            <i className="fas fa-eye"></i>
            Preview Configuration
          </button>
          
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleCreateRepository}
            disabled={isCreating}
          >
            {isCreating ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                Creating Repository...
              </>
            ) : (
              <>
                <i className="fas fa-plus-circle"></i>
                Create Repository
              </>
            )}
          </button>
        </div>
      </main>
    </div>
  );
};

export default RepositoryCreation;
