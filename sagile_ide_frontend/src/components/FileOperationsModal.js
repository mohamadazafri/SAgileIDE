import React, { useState, useEffect } from 'react';
import { repositoriesAPI } from '../services/api';

const FileOperationsModal = ({ 
  isOpen, 
  onClose, 
  operation, // 'create-file', 'create-folder', 'rename', 'delete'
  currentRepository,
  targetFile = null,
  parentPath = '',
  onSuccess 
}) => {
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('code');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setError('');
      if (operation === 'rename' && targetFile) {
        setFileName(targetFile.name);
      } else {
        setFileName('');
      }
    }
  }, [isOpen, operation, targetFile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (operation !== 'delete' && !fileName.trim()) {
      setError('File name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      switch (operation) {
        case 'create-file':
          await handleCreateFile();
          break;
        case 'create-folder':
          await handleCreateFolder();
          break;
        case 'rename':
          await handleRename();
          break;
        case 'delete':
          await handleDelete();
          break;
        default:
          throw new Error('Unknown operation');
      }
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error(`Error ${operation}:`, error);
      
      // Extract error message from response if available
      let errorMessage = `Failed to ${operation.replace('-', ' ')}`;
      if (error.response && error.response.data && error.response.data.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFile = async () => {
    const filePath = parentPath ? `${parentPath}/${fileName}` : fileName;
    const extension = fileName.split('.').pop();
    
    await repositoriesAPI.addFile(currentRepository.id, {
      file_path: filePath,
      file_name: fileName,
      file_type: getFileType(extension),
      content: getDefaultContent(extension)
    });
  };

  const handleCreateFolder = async () => {
    // Create a placeholder file in the folder to ensure it exists
    const folderPath = parentPath ? `${parentPath}/${fileName}` : fileName;
    const placeholderPath = `${folderPath}/.gitkeep`;
    
    await repositoriesAPI.addFile(currentRepository.id, {
      file_path: placeholderPath,
      file_name: '.gitkeep',
      file_type: 'other',
      content: '# This file keeps the folder in version control'
    });
  };

  const handleRename = async () => {
    if (!targetFile) return;
    
    // Calculate new path by replacing the filename
    const pathParts = targetFile.path.split('/');
    pathParts[pathParts.length - 1] = fileName; // Replace the filename
    const newPath = pathParts.join('/');
    
    // Use the update API to rename the file
    await repositoriesAPI.updateFile(currentRepository.id, targetFile.path, {
      file_path: newPath,
      file_name: fileName
    });
  };

  const handleDelete = async () => {
    if (!targetFile || !currentRepository?.id) return;
    
    await repositoriesAPI.removeFile(currentRepository.id, targetFile.path);
  };

  const getFileType = (extension) => {
    const typeMap = {
      'js': 'code',
      'jsx': 'code',
      'ts': 'code',
      'tsx': 'code',
      'py': 'code',
      'java': 'code',
      'html': 'code',
      'css': 'code',
      'scss': 'code',
      'json': 'config',
      'yml': 'config',
      'yaml': 'config',
      'env': 'config',
      'md': 'documentation',
      'txt': 'documentation',
      'test.js': 'test',
      'spec.js': 'test',
      'png': 'asset',
      'jpg': 'asset',
      'svg': 'asset'
    };
    
    return typeMap[extension] || 'other';
  };

  const getDefaultContent = (extension) => {
    const templates = {
      'js': '// JavaScript file\n\n',
      'jsx': 'import React from \'react\';\n\nconst Component = () => {\n  return (\n    <div>\n      \n    </div>\n  );\n};\n\nexport default Component;\n',
      'ts': '// TypeScript file\n\n',
      'tsx': 'import React from \'react\';\n\ninterface Props {\n  \n}\n\nconst Component: React.FC<Props> = () => {\n  return (\n    <div>\n      \n    </div>\n  );\n};\n\nexport default Component;\n',
      'py': '# Python file\n\n',
      'html': '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Document</title>\n</head>\n<body>\n  \n</body>\n</html>\n',
      'css': '/* CSS file */\n\n',
      'md': '# Title\n\nContent goes here...\n',
      'json': '{\n  \n}\n'
    };
    
    return templates[extension] || '';
  };

  const getModalTitle = () => {
    switch (operation) {
      case 'create-file':
        return 'Create New File';
      case 'create-folder':
        return 'Create New Folder';
      case 'rename':
        return `Rename ${targetFile?.type === 'folder' ? 'Folder' : 'File'}`;
      case 'delete':
        return `Delete ${targetFile?.type === 'folder' ? 'Folder' : 'File'}`;
      default:
        return 'File Operation';
    }
  };

  const getPlaceholder = () => {
    switch (operation) {
      case 'create-file':
        return 'e.g., index.js, styles.css, README.md';
      case 'create-folder':
        return 'e.g., components, utils, assets';
      case 'rename':
        return 'Enter new name';
      default:
        return 'Enter name';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{getModalTitle()}</h3>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="modal-body">
          {operation === 'delete' ? (
            <div className="delete-confirmation">
              <div className="warning-icon">
                <i className="fas fa-exclamation-triangle"></i>
              </div>
              <p>
                Are you sure you want to delete <strong>{targetFile?.name}</strong>?
              </p>
              <p className="warning-text">
                This action cannot be undone.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="fileName">
                  {operation === 'create-folder' ? 'Folder Name' : 'File Name'}
                </label>
                <input
                  type="text"
                  id="fileName"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder={getPlaceholder()}
                  disabled={loading}
                  autoFocus
                />
                {parentPath && (
                  <div className="path-info">
                    Path: <code>{parentPath}/{fileName || '...'}</code>
                  </div>
                )}
              </div>

              {operation === 'create-file' && (
                <div className="form-group">
                  <label htmlFor="fileType">File Type</label>
                  <select
                    id="fileType"
                    value={fileType}
                    onChange={(e) => setFileType(e.target.value)}
                    disabled={loading}
                  >
                    <option value="code">Code File</option>
                    <option value="config">Configuration</option>
                    <option value="documentation">Documentation</option>
                    <option value="test">Test File</option>
                    <option value="asset">Asset</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              )}

              {error && (
                <div className="error-message">
                  <i className="fas fa-exclamation-circle"></i>
                  {error}
                </div>
              )}
            </form>
          )}
        </div>

        <div className="modal-footer">
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button 
            type={operation === 'delete' ? 'button' : 'submit'}
            className={`btn ${operation === 'delete' ? 'btn-danger' : 'btn-primary'}`}
            onClick={handleSubmit}
            disabled={loading || (operation !== 'delete' && !fileName.trim())}
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                {operation === 'delete' ? 'Deleting...' : 'Creating...'}
              </>
            ) : (
              <>
                {operation === 'delete' && <i className="fas fa-trash"></i>}
                {operation === 'create-file' && <i className="fas fa-file-plus"></i>}
                {operation === 'create-folder' && <i className="fas fa-folder-plus"></i>}
                {operation === 'rename' && <i className="fas fa-edit"></i>}
                {operation === 'delete' ? 'Delete' : 
                 operation === 'rename' ? 'Rename' : 'Create'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FileOperationsModal;
