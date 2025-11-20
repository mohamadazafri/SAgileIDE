import React, { useState, useRef, useEffect } from 'react';
import { repositoriesAPI } from '../services/api';

const ProjectInitialization = ({ 
  onProjectTypeChange, 
  onFilesUploaded, 
  onTemplateSelected,
  selectedTemplate,
  templateVariables,
  onTemplateVariableChange,
  repositoryName,
  showTemplateVariables,
  onToggleTemplateVariables
}) => {
  const [selectedOption, setSelectedOption] = useState('fresh');
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [localSelectedTemplate, setLocalSelectedTemplate] = useState(null);
  const [availableTemplates, setAvailableTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const fileInputRef = useRef(null);

  // Load templates from backend on component mount
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        setLoadingTemplates(true);
        const response = await repositoriesAPI.getProjectTemplates();
        setAvailableTemplates(response.templates || []);
      } catch (error) {
        console.error('Error loading templates:', error);
        // Fallback to static templates if backend fails
        setAvailableTemplates([
    {
            id: 'react_frontend',
      name: 'React Application',
      description: 'Modern React app with TypeScript and Vite',
      icon: 'fab fa-react',
      color: 'var(--info)',
      features: ['TypeScript', 'Vite', 'ESLint', 'Prettier']
    },
    {
            id: 'node_backend',
      name: 'Node.js API',
      description: 'Express.js REST API with TypeScript',
      icon: 'fab fa-node-js',
      color: 'var(--success)',
      features: ['Express.js', 'TypeScript', 'Jest', 'Swagger']
    },
    {
            id: 'python_flask',
            name: 'Python Flask App',
            description: 'Flask web application with SQLAlchemy',
      icon: 'fab fa-python',
      color: 'var(--info)',
      features: ['Flask', 'SQLAlchemy', 'Jinja2', 'Pytest']
    },
    {
            id: 'basic_html',
            name: 'Basic HTML',
            description: 'Simple HTML/CSS/JS project',
            icon: 'fab fa-html5',
            color: 'var(--warning)',
            features: ['HTML5', 'CSS3', 'JavaScript']
    }
        ]);
      } finally {
        setLoadingTemplates(false);
      }
    };

    loadTemplates();
  }, []);

  const handleOptionChange = (option) => {
    setSelectedOption(option);
    onProjectTypeChange(option);
    
    // Reset template selection when switching options
    if (option !== 'fresh') {
      setLocalSelectedTemplate(null);
      if (onTemplateSelected) {
        onTemplateSelected(null);
      }
    }
  };

  const handleTemplateSelect = (template) => {
    setLocalSelectedTemplate(template);
    if (onTemplateSelected) {
      onTemplateSelected(template);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFileUpload(files);
  };

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files);
    handleFileUpload(files);
  };

  const handleFileUpload = (files) => {
    setIsUploading(true);
    
    // Simulate file processing
    setTimeout(() => {
      const processedFiles = files.map(file => ({
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        path: file.webkitRelativePath || file.name
      }));
      
      setUploadedFiles(processedFiles);
      setIsUploading(false);
      onFilesUploaded(processedFiles);
    }, 1500);
  };

  const removeFile = (index) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(newFiles);
    onFilesUploaded(newFiles);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileName) => {
    const extension = fileName.split('.').pop().toLowerCase();
    const iconMap = {
      'js': 'fab fa-js-square',
      'jsx': 'fab fa-react',
      'ts': 'fab fa-js-square',
      'tsx': 'fab fa-react',
      'html': 'fab fa-html5',
      'css': 'fab fa-css3-alt',
      'json': 'fas fa-file-code',
      'md': 'fab fa-markdown',
      'py': 'fab fa-python',
      'java': 'fab fa-java',
      'php': 'fab fa-php',
      'go': 'fab fa-golang',
      'rs': 'fab fa-rust',
      'cpp': 'fas fa-file-code',
      'c': 'fas fa-file-code',
      'h': 'fas fa-file-code',
      'sql': 'fas fa-database',
      'xml': 'fas fa-file-code',
      'yml': 'fas fa-file-code',
      'yaml': 'fas fa-file-code',
      'txt': 'fas fa-file-alt',
      'pdf': 'fas fa-file-pdf',
      'doc': 'fas fa-file-word',
      'docx': 'fas fa-file-word',
      'xls': 'fas fa-file-excel',
      'xlsx': 'fas fa-file-excel',
      'ppt': 'fas fa-file-powerpoint',
      'pptx': 'fas fa-file-powerpoint',
      'zip': 'fas fa-file-archive',
      'rar': 'fas fa-file-archive',
      '7z': 'fas fa-file-archive',
      'tar': 'fas fa-file-archive',
      'gz': 'fas fa-file-archive'
    };
    return iconMap[extension] || 'fas fa-file';
  };

  return (
    <section className="project-initialization">
      <h2 className="section-title">
        <i className="fas fa-rocket"></i>
        Project Initialization
      </h2>

      <div className="initialization-options">
        <div className="option-tabs">
          <button 
            className={`option-tab ${selectedOption === 'fresh' ? 'active' : ''}`}
            onClick={() => handleOptionChange('fresh')}
          >
            <i className="fas fa-plus-circle"></i>
            Start Fresh
          </button>
          <button 
            className={`option-tab ${selectedOption === 'upload' ? 'active' : ''}`}
            onClick={() => handleOptionChange('upload')}
          >
            <i className="fas fa-upload"></i>
            Upload Project
          </button>
        </div>

        {selectedOption === 'fresh' && (
          <div className="template-selection">
            <h3 className="template-title">Choose a Project Template</h3>
            
            {loadingTemplates ? (
              <div className="loading-templates">
                <i className="fas fa-spinner fa-spin"></i>
                <p>Loading templates...</p>
              </div>
            ) : (
            <div className="template-grid">
                {availableTemplates.map(template => (
                  <div 
                    key={template.id} 
                    className={`template-card ${selectedTemplate?.id === template.id ? 'selected' : ''}`}
                    onClick={() => handleTemplateSelect(template)}
                  >
                  <div className="template-header">
                      <i className={template.icon || 'fas fa-code'} style={{color: template.color || 'var(--primary)'}}></i>
                    <h4 className="template-name">{template.name}</h4>
                      {selectedTemplate?.id === template.id && (
                        <i className="fas fa-check-circle selected-icon"></i>
                      )}
                  </div>
                  <p className="template-description">{template.description}</p>
                  <div className="template-features">
                      {(template.features || []).map((feature, index) => (
                      <span key={index} className="feature-tag">{feature}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            )}
            
            {selectedTemplate && (
              <div className="selected-template-info">
                <div className="info-header">
                  <i className="fas fa-info-circle"></i>
                  <span>Selected Template: <strong>{selectedTemplate.name}</strong></span>
                </div>
                <p>{selectedTemplate.description}</p>
              </div>
            )}

            {/* Template Configuration */}
            {selectedTemplate && (
              <div className="template-configuration">
                <div className="template-config-header">
                  <h4 className="config-title">
                    <i className="fas fa-cogs"></i>
                    Template Configuration
                  </h4>
                  <button
                    type="button"
                    className="btn btn-link template-toggle"
                    onClick={() => onToggleTemplateVariables(!showTemplateVariables)}
                  >
                    <i className={`fas fa-chevron-${showTemplateVariables ? 'up' : 'down'}`}></i>
                    {showTemplateVariables ? 'Hide' : 'Customize'} Variables
                  </button>
                </div>
                
                <p className="config-info">
                  Using smart defaults from repository settings.
                  {!showTemplateVariables && ' Click "Customize" to personalize the generated files.'}
                </p>

                {showTemplateVariables && (
                  <div className="template-variables-form">
                    <div className="form-group">
                      <label className="form-label" htmlFor="templateProjectName">
                        Project Name
                      </label>
                      <input
                        type="text"
                        id="templateProjectName"
                        className="form-input"
                        placeholder={repositoryName || "MyAwesomeProject"}
                        value={templateVariables?.project_name || ''}
                        onChange={(e) => onTemplateVariableChange('project_name', e.target.value)}
                      />
                      <small className="form-hint">
                        Used in package.json, README, and other template files
                      </small>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="templateAuthor">
                        Author Name
                      </label>
                      <input
                        type="text"
                        id="templateAuthor"
                        className="form-input"
                        placeholder="Your Name"
                        value={templateVariables?.author || ''}
                        onChange={(e) => onTemplateVariableChange('author', e.target.value)}
                      />
                      <small className="form-hint">
                        Used in package.json, license, and documentation
                      </small>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="templateDescription">
                        Project Description
                      </label>
                      <textarea
                        id="templateDescription"
                        className="form-input form-textarea"
                        placeholder={`A ${selectedTemplate.name} project`}
                        value={templateVariables?.description || ''}
                        onChange={(e) => onTemplateVariableChange('description', e.target.value)}
                      />
                      <small className="form-hint">
                        Used in README, package.json, and project documentation
                      </small>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {selectedOption === 'upload' && (
          <div className="upload-section">
            <div 
              className={`upload-area ${isDragOver ? 'drag-over' : ''} ${isUploading ? 'uploading' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                webkitdirectory=""
                style={{ display: 'none' }}
                onChange={handleFileInput}
              />
              
              {isUploading ? (
                <div className="upload-content">
                  <i className="fas fa-spinner fa-spin upload-icon"></i>
                  <h3>Processing Files...</h3>
                  <p>Please wait while we process your project files</p>
                </div>
              ) : (
                <div className="upload-content">
                  <i className="fas fa-cloud-upload-alt upload-icon"></i>
                  <h3>Upload Your Project</h3>
                  <p>Drag and drop your project folder here, or click to browse</p>
                  <div className="upload-hint">
                    <i className="fas fa-info-circle"></i>
                    <span>Supports folders, ZIP files, and individual files</span>
                  </div>
                </div>
              )}
            </div>

            {uploadedFiles.length > 0 && (
              <div className="uploaded-files">
                <h4 className="files-title">
                  <i className="fas fa-folder-open"></i>
                  Uploaded Files ({uploadedFiles.length})
                </h4>
                <div className="files-list">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="file-item">
                      <i className={getFileIcon(file.name)}></i>
                      <div className="file-info">
                        <span className="file-name">{file.name}</span>
                        <span className="file-size">{formatFileSize(file.size)}</span>
                      </div>
                      <button 
                        className="remove-file-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(index);
                        }}
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default ProjectInitialization;
