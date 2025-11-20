import React, { useState, useEffect } from 'react';
import { repositoriesAPI } from '../services/api';
import FileOperationsModal from './FileOperationsModal';

const FileExplorer = ({ currentRepository, onFileSelect, selectedFile, refreshTrigger }) => {
  const [expandedFolders, setExpandedFolders] = useState(['src', 'components']);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [modal, setModal] = useState({ isOpen: false, operation: null, targetFile: null, parentPath: '' });

  // Load repository files when repository changes or refresh is triggered
  useEffect(() => {
    if (currentRepository?.id) {
      loadRepositoryFiles();
    }
  }, [currentRepository, refreshTrigger]);

  const loadRepositoryFiles = async () => {
    if (!currentRepository?.id) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await repositoriesAPI.getRepositoryFiles(currentRepository.id);
      const repositoryFiles = response.files || [];
      
      // Convert flat file list to tree structure
      const fileTree = buildFileTree(repositoryFiles);
      setFiles(fileTree);
      
      // Auto-expand root folders
      const rootFolders = fileTree.filter(item => item.type === 'folder').map(f => f.name);
      setExpandedFolders(prev => [...new Set([...prev, ...rootFolders])]);
      
    } catch (error) {
      console.error('Error loading repository files:', error);
      setError('Failed to load repository files');
    } finally {
      setLoading(false);
    }
  };

  const buildFileTree = (files) => {
    const tree = [];
    const folderMap = new Map();

    // Sort files by path to ensure proper tree structure
    const sortedFiles = files.sort((a, b) => a.file_path.localeCompare(b.file_path));

    sortedFiles.forEach(file => {
      const pathParts = file.file_path.split('/').filter(part => part !== '');
      let currentLevel = tree;
      let currentPath = '';

      // Build folder structure
      for (let i = 0; i < pathParts.length - 1; i++) {
        const folderName = pathParts[i];
        currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;
        
        let folder = currentLevel.find(item => item.name === folderName && item.type === 'folder');
        if (!folder) {
          folder = {
            name: folderName,
            type: 'folder',
            path: currentPath,
            expanded: expandedFolders.includes(currentPath),
            children: []
          };
          currentLevel.push(folder);
          folderMap.set(currentPath, folder);
        }
        currentLevel = folder.children;
      }

      // Add the file
      const fileName = pathParts[pathParts.length - 1] || file.file_name;
      const fileItem = {
        name: fileName,
        type: 'file',
        path: file.file_path,
        file_type: file.file_type,
        file_extension: file.file_extension,
        content: file.content,
        last_modified: file.last_modified,
        size: file.file_size,
        icon: getFileIcon(file.file_extension, file.file_type),
        color: getFileColor(file.file_extension, file.file_type),
        selected: selectedFile?.path === file.file_path,
        gitStatus: file.git_status || null // Git status from backend
      };
      currentLevel.push(fileItem);
    });

    return tree;
  };

  const getFileIcon = (extension, fileType) => {
    const iconMap = {
      // Web files
      'js': 'fab fa-js-square',
      'jsx': 'fab fa-react',
      'ts': 'fab fa-js-square',
      'tsx': 'fab fa-react',
      'html': 'fab fa-html5',
      'css': 'fab fa-css3-alt',
      'scss': 'fab fa-sass',
      'less': 'fab fa-less',
      
      // Backend files
      'py': 'fab fa-python',
      'java': 'fab fa-java',
      'php': 'fab fa-php',
      'rb': 'fas fa-gem',
      'go': 'fab fa-google',
      
      // Config files
      'json': 'fas fa-cog',
      'xml': 'fas fa-code',
      'yml': 'fas fa-cog',
      'yaml': 'fas fa-cog',
      'env': 'fas fa-cog',
      
      // Documentation
      'md': 'fab fa-markdown',
      'txt': 'fas fa-file-alt',
      'pdf': 'fas fa-file-pdf',
      
      // Images
      'png': 'fas fa-image',
      'jpg': 'fas fa-image',
      'jpeg': 'fas fa-image',
      'gif': 'fas fa-image',
      'svg': 'fas fa-image',
    };
    
    return iconMap[extension?.toLowerCase()] || 'fas fa-file';
  };

  const getFileColor = (extension, fileType) => {
    const colorMap = {
      'js': 'var(--warning)',
      'jsx': 'var(--info)',
      'ts': 'var(--info)',
      'tsx': 'var(--info)',
      'html': 'var(--error)',
      'css': 'var(--info)',
      'scss': 'var(--purple)',
      'py': 'var(--success)',
      'java': 'var(--error)',
      'json': 'var(--text-secondary)',
      'md': 'var(--text-secondary)',
    };
    
    return colorMap[extension?.toLowerCase()] || 'var(--text-secondary)';
  };

  const toggleFolder = (folderPath) => {
    setExpandedFolders(prev => 
      prev.includes(folderPath) 
        ? prev.filter(f => f !== folderPath)
        : [...prev, folderPath]
    );
  };

  const handleFileClick = (file) => {
    if (onFileSelect) {
      onFileSelect(file);
    }
  };

  const handleCreateFile = (parentPath = '') => {
    setModal({
      isOpen: true,
      operation: 'create-file',
      targetFile: null,
      parentPath
    });
  };

  const handleCreateFolder = (parentPath = '') => {
    setModal({
      isOpen: true,
      operation: 'create-folder',
      targetFile: null,
      parentPath
    });
  };

  const handleRename = (file) => {
    setModal({
      isOpen: true,
      operation: 'rename',
      targetFile: file,
      parentPath: ''
    });
  };

  const handleDelete = (file) => {
    setModal({
      isOpen: true,
      operation: 'delete',
      targetFile: file,
      parentPath: ''
    });
  };

  const handleRefresh = () => {
    loadRepositoryFiles();
  };

  const handleModalSuccess = () => {
    loadRepositoryFiles(); // Refresh file tree after successful operation
  };

  const closeModal = () => {
    setModal({ isOpen: false, operation: null, targetFile: null, parentPath: '' });
  };

  const handleContextMenu = (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      item
    });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  const handleContextMenuAction = (action, item) => {
    closeContextMenu();
    
    switch (action) {
      case 'rename':
        handleRename(item);
        break;
      case 'delete':
        handleDelete(item);
        break;
      case 'create-file':
        handleCreateFile(item.path);
        break;
      case 'create-folder':
        handleCreateFolder(item.path);
        break;
      default:
        break;
    }
  };

  // Close context menu when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu) {
        closeContextMenu();
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [contextMenu]);

  // Update folder expanded state in the tree
  const updateTreeExpanded = (tree) => {
    return tree.map(item => {
      if (item.type === 'folder') {
        return {
          ...item,
          expanded: expandedFolders.includes(item.path),
          children: item.children ? updateTreeExpanded(item.children) : []
        };
      }
      return {
        ...item,
        selected: selectedFile?.path === item.path
      };
    });
  };

  const currentFileTree = updateTreeExpanded(files);

  const getGitStatusIcon = (status) => {
    switch (status) {
      case 'modified':
        return 'M';
      case 'added':
        return 'A';
      case 'deleted':
        return 'D';
      case 'renamed':
        return 'R';
      case 'untracked':
        return 'U';
      default:
        return null;
    }
  };

  const renderFileItem = (item, level = 0) => {
    const marginLeft = level * 20;
    
    if (item.type === 'folder') {
      return (
        <React.Fragment key={item.path || item.name}>
          <li 
            className="file-item folder-item" 
            style={{ marginLeft }}
            onClick={() => toggleFolder(item.path)}
            onContextMenu={(e) => handleContextMenu(e, item)}
          >
            <span className="folder-toggle">
              <i className={`fas fa-chevron-${item.expanded ? 'down' : 'right'}`}></i>
            </span>
            <i 
              className={`fas fa-folder${item.expanded ? '-open' : ''}`} 
              style={{ color: 'var(--warning)' }}
            ></i>
            <span>{item.name}</span>
          </li>
          {item.expanded && item.children && item.children.map(child => renderFileItem(child, level + 1))}
        </React.Fragment>
      );
    } else {
      const gitStatusClass = item.gitStatus ? `git-${item.gitStatus}` : '';
      const gitStatusIcon = getGitStatusIcon(item.gitStatus);
      
      return (
        <li 
          key={item.path || item.name}
          className={`file-item ${item.selected ? 'selected' : ''} ${gitStatusClass}`}
          style={{ marginLeft }}
          onClick={() => handleFileClick(item)}
          onContextMenu={(e) => handleContextMenu(e, item)}
        >
          <span className="folder-toggle"></span>
          <i className={item.icon} style={{ color: item.color }}></i>
          <span>{item.name}</span>
          {gitStatusIcon && (
            <span className="git-status-indicator" title={`Git: ${item.gitStatus}`}>
              {gitStatusIcon}
            </span>
          )}
          {item.size && (
            <span className="file-size" title={`${item.size} bytes`}>
              {formatFileSize(item.size)}
            </span>
          )}
        </li>
      );
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
    return `${Math.round(bytes / (1024 * 1024))}MB`;
  };

  if (!currentRepository) {
    return (
      <div className="panel-section">
        <div className="panel-header">
          <span><i className="fas fa-folder-open"></i> REPOSITORY</span>
        </div>
        <div className="panel-content">
          <div className="empty-state">
            <i className="fas fa-folder-open"></i>
            <p>No repository selected</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel-section">
      <div className="panel-header">
        <span><i className="fas fa-folder-open"></i> {currentRepository.name.toUpperCase()}</span>
        <div className="panel-actions">
          <button 
            className="panel-action-btn" 
            title="Create File"
            onClick={() => handleCreateFile()}
          >
            <i className="fas fa-file-plus"></i>
          </button>
          <button 
            className="panel-action-btn" 
            title="Create Folder"
            onClick={() => handleCreateFolder()}
          >
            <i className="fas fa-folder-plus"></i>
          </button>
          <button 
            className="panel-action-btn" 
            title="Refresh"
            onClick={handleRefresh}
          >
            <i className="fas fa-sync"></i>
          </button>
        </div>
      </div>
      
      <div className="panel-content">
        {loading && (
          <div className="loading-state">
            <i className="fas fa-spinner fa-spin"></i>
            <p>Loading files...</p>
          </div>
        )}
        
        {error && (
          <div className="error-state">
            <i className="fas fa-exclamation-triangle"></i>
            <p>{error}</p>
            <button className="btn btn-sm" onClick={handleRefresh}>
              <i className="fas fa-redo"></i> Retry
            </button>
          </div>
        )}
        
        {!loading && !error && (
          <>
        <div className="repo-actions">
              <button className="repo-action-btn" onClick={() => handleCreateFile()}>
            <i className="fas fa-plus"></i> New File
          </button>
              <button className="repo-action-btn" onClick={() => handleCreateFolder()}>
            <i className="fas fa-folder-plus"></i> New Folder
          </button>
        </div>

            {currentFileTree.length === 0 ? (
              <div className="empty-state">
                <i className="fas fa-folder-open"></i>
                <p>No files in repository</p>
                <button className="btn btn-sm btn-primary" onClick={() => handleCreateFile()}>
                  <i className="fas fa-plus"></i> Create First File
                </button>
              </div>
            ) : (
        <ul className="file-tree">
                {currentFileTree.map(item => renderFileItem(item))}
        </ul>
            )}
          </>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div 
          className="context-menu"
          style={{ 
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            zIndex: 1000
          }}
        >
          {contextMenu.item.type === 'folder' ? (
            <>
              <button 
                className="context-menu-item"
                onClick={() => handleContextMenuAction('create-file', contextMenu.item)}
              >
                <i className="fas fa-file-plus"></i>
                New File
              </button>
              <button 
                className="context-menu-item"
                onClick={() => handleContextMenuAction('create-folder', contextMenu.item)}
              >
                <i className="fas fa-folder-plus"></i>
                New Folder
              </button>
              <div className="context-menu-separator"></div>
              <button 
                className="context-menu-item"
                onClick={() => handleContextMenuAction('rename', contextMenu.item)}
              >
                <i className="fas fa-edit"></i>
                Rename
              </button>
              <button 
                className="context-menu-item danger"
                onClick={() => handleContextMenuAction('delete', contextMenu.item)}
              >
                <i className="fas fa-trash"></i>
                Delete
              </button>
            </>
          ) : (
            <>
              <button 
                className="context-menu-item"
                onClick={() => handleContextMenuAction('rename', contextMenu.item)}
              >
                <i className="fas fa-edit"></i>
                Rename
              </button>
              <button 
                className="context-menu-item danger"
                onClick={() => handleContextMenuAction('delete', contextMenu.item)}
              >
                <i className="fas fa-trash"></i>
                Delete
              </button>
            </>
          )}
        </div>
      )}

      {/* File Operations Modal */}
      <FileOperationsModal
        isOpen={modal.isOpen}
        onClose={closeModal}
        operation={modal.operation}
        currentRepository={currentRepository}
        targetFile={modal.targetFile}
        parentPath={modal.parentPath}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
};

export default FileExplorer;
