import React, { useState, useRef, useEffect } from 'react';
import { repositoriesAPI } from '../services/api';
import MonacoCodeEditor from './MonacoCodeEditor';
import { useSettings } from '../context/SettingsContext';

const Editor = ({ onCodeSelection, selectedTask, selectedFile, currentRepository, onFileContentUpdated }) => {
  const { settings } = useSettings();
  const [openTabs, setOpenTabs] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [selectedText, setSelectedText] = useState('');
  const [fileContents, setFileContents] = useState({});
  const [unsavedChanges, setUnsavedChanges] = useState({});
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState({}); // Track save status per file
  const textareaRef = useRef(null);
  const autoSaveTimeoutRef = useRef(null);

  // Get language from file extension
  const getLanguageFromPath = (filePath) => {
    if (!filePath) return 'text';
    
    const extension = filePath.split('.').pop()?.toLowerCase();
    const languageMap = {
      'js': 'javascript',
      'jsx': 'jsx',
      'ts': 'typescript',
      'tsx': 'tsx',
      'py': 'python',
      'java': 'java',
      'css': 'css',
      'scss': 'scss',
      'sass': 'scss',
      'json': 'json',
      'md': 'markdown',
      'sh': 'bash',
      'bash': 'bash',
      'sql': 'sql',
      'yml': 'yaml',
      'yaml': 'yaml',
      'xml': 'markup',
      'html': 'markup',
      'htm': 'markup',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'swift': 'swift',
      'kt': 'kotlin'
    };
    
    return languageMap[extension] || 'text';
  };

  // Open file when selectedFile changes
  useEffect(() => {
    if (selectedFile) {
      openFileInTab(selectedFile);
    }
  }, [selectedFile]);

  const openFileInTab = (file) => {
    // Check if file is already open
    const existingTab = openTabs.find(tab => tab.path === file.path);
    if (existingTab) {
      setActiveTab(file.path);
      return;
    }

    // Create new tab
    const newTab = {
      id: file.path,
      path: file.path,
      name: file.name,
      icon: file.icon,
      color: file.color,
      content: file.content || '',
      modified: false
    };

    setOpenTabs(prev => [...prev, newTab]);
    setActiveTab(file.path);
    setFileContents(prev => ({
      ...prev,
      [file.path]: file.content || ''
    }));
  };

  const closeTab = (tabPath, event) => {
    event.stopPropagation();

    // Check for unsaved changes
    if (unsavedChanges[tabPath]) {
      if (!window.confirm('You have unsaved changes. Are you sure you want to close this file?')) {
        return;
      }
    }

    setOpenTabs(prev => prev.filter(tab => tab.path !== tabPath));
    
    // If closing active tab, switch to another tab
    if (activeTab === tabPath) {
      const remainingTabs = openTabs.filter(tab => tab.path !== tabPath);
      setActiveTab(remainingTabs.length > 0 ? remainingTabs[remainingTabs.length - 1].path : null);
    }

    // Clean up state
    setFileContents(prev => {
      const newContents = { ...prev };
      delete newContents[tabPath];
      return newContents;
    });
    
    setUnsavedChanges(prev => {
      const newChanges = { ...prev };
      delete newChanges[tabPath];
      return newChanges;
    });
  };

  const handleContentChange = (content) => {
    if (!activeTab) return;

    setFileContents(prev => ({
      ...prev,
      [activeTab]: content
    }));

    // Mark as modified if content differs from original
    const activeFile = openTabs.find(tab => tab.path === activeTab);
    const hasChanges = content !== (activeFile?.content || '');
    
    setUnsavedChanges(prev => ({
      ...prev,
      [activeTab]: hasChanges
    }));

    // Update tab modified state
    setOpenTabs(prev => prev.map(tab => 
      tab.path === activeTab ? { ...tab, modified: hasChanges } : tab
    ));
  
    // Auto-save after configured delay
    if (hasChanges) {
      clearTimeout(autoSaveTimeoutRef.current);
      const currentFilePath = activeTab;
      const currentContent = content; // Capture the content at this moment
      autoSaveTimeoutRef.current = setTimeout(() => {
        autoSaveFileWithContent(currentFilePath, currentContent);
      }, settings.autoSaveDelay);
    }
  };

  const autoSaveFileWithContent = async (filePath, content) => {
    if (!filePath || !currentRepository) return;
    // Allow empty content to be saved
    if (content === undefined || content === null) return;

    try {
      setSaveStatus(prev => ({ ...prev, [filePath]: 'saving' }));
      
      await repositoriesAPI.updateFile(currentRepository.id, filePath, { 
        content: content 
      });

      // Update fileContents state with the saved content
      setFileContents(prev => ({
        ...prev,
        [filePath]: content
      }));
      
      // Mark as saved
      setUnsavedChanges(prev => ({
        ...prev,
        [filePath]: false
      }));
      
      // Update tab content with the saved content
      setOpenTabs(prev => prev.map(tab => 
        tab.path === filePath ? { ...tab, modified: false, content: content } : tab
      ));

      setSaveStatus(prev => ({ ...prev, [filePath]: 'saved' }));
      
      // Trigger file tree refresh to update content
      if (onFileContentUpdated) {
        onFileContentUpdated();
      }
      
      // Clear save status after 2 seconds
      setTimeout(() => {
        setSaveStatus(prev => ({ ...prev, [filePath]: null }));
      }, 2000);
      
    } catch (error) {
      console.error('Auto-save failed:', error);
      setSaveStatus(prev => ({ ...prev, [filePath]: 'error' }));
      
      // Clear error status after 3 seconds
      setTimeout(() => {
        setSaveStatus(prev => ({ ...prev, [filePath]: null }));
      }, 3000);
    }
  };


  // Listen for Monaco's save event (Ctrl+S)
  useEffect(() => {
    const handleMonacoSave = () => {
      if (activeTab) {
        saveFile(activeTab);
      }
    };

    const handleMonacoSelection = (e) => {
      if (e.detail && onCodeSelection) {
        setSelectedText(e.detail);
        onCodeSelection(e.detail);
      }
    };

    window.addEventListener('monaco-save', handleMonacoSave);
    window.addEventListener('monaco-selection', handleMonacoSelection);
    
    return () => {
      window.removeEventListener('monaco-save', handleMonacoSave);
      window.removeEventListener('monaco-selection', handleMonacoSelection);
    };
  }, [activeTab, fileContents, onCodeSelection]);

  const saveFile = async (filePath = activeTab) => {
    if (!filePath || !currentRepository) return;

    try {
      setLoading(true);
      setSaveStatus(prev => ({ ...prev, [filePath]: 'saving' }));
      
      // Get the most current content from state
      const currentContent = fileContents[filePath];
      
      // Save file content to repository
      await repositoriesAPI.updateFile(currentRepository.id, filePath, { 
        content: currentContent 
      });
      
      // Mark as saved
      setUnsavedChanges(prev => ({
        ...prev,
        [filePath]: false
      }));
      
      // Update tab content with the saved content
      setOpenTabs(prev => prev.map(tab => 
        tab.path === filePath ? { ...tab, modified: false, content: currentContent } : tab
      ));

      setSaveStatus(prev => ({ ...prev, [filePath]: 'saved' }));
      
      // Trigger file tree refresh to update content
      if (onFileContentUpdated) {
        onFileContentUpdated();
      }
      
      // Clear save status after 2 seconds
      setTimeout(() => {
        setSaveStatus(prev => ({ ...prev, [filePath]: null }));
      }, 2000);
      
    } catch (error) {
      console.error('Error saving file:', error);
      setSaveStatus(prev => ({ ...prev, [filePath]: 'error' }));
      alert('Failed to save file. Please try again.');
      
      // Clear error status after 3 seconds
      setTimeout(() => {
        setSaveStatus(prev => ({ ...prev, [filePath]: null }));
      }, 3000);
    } finally {
      setLoading(false);
    }
  };

  const saveAllFiles = async () => {
    const modifiedFiles = Object.keys(unsavedChanges).filter(path => unsavedChanges[path]);
    for (const filePath of modifiedFiles) {
      await saveFile(filePath);
  }
  };

  const getCurrentFileContent = () => {
    if (!activeTab) return '';
    return fileContents[activeTab] || '';
  };

  const getActiveTabInfo = () => {
    return openTabs.find(tab => tab.path === activeTab);
  };

  const getSaveStatusIndicator = (filePath) => {
    const status = saveStatus[filePath];
    const hasUnsavedChanges = unsavedChanges[filePath];

    if (status === 'saving') {
      return <span className="save-status saving"><i className="fas fa-spinner fa-spin"></i> Saving...</span>;
    }
    if (status === 'saved') {
      return <span className="save-status saved"><i className="fas fa-check"></i> Saved</span>;
    }
    if (status === 'error') {
      return <span className="save-status error"><i className="fas fa-exclamation-triangle"></i> Save failed</span>;
  }
    if (hasUnsavedChanges) {
      return <span className="save-status unsaved">● Unsaved changes</span>;
    }
    
    return null;
  };

  const handleCodeSelection = (e) => {
    if (e && e.target) {
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const selectedText = e.target.value.substring(start, end);
      
      if (selectedText.trim()) {
        setSelectedText(selectedText);
        onCodeSelection({
          text: selectedText,
          start,
          end,
          file: activeTab
        });
      } else {
        setSelectedText('');
        onCodeSelection(null);
      }
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+S or Cmd+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveFile();
      }
      // Ctrl+Shift+S or Cmd+Shift+S to save all
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        saveAllFiles();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, fileContents]);

  // Cleanup auto-save timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  const presenceUsers = [
    { initials: 'SM', name: 'Sarah Manager', role: 'Project Manager', color: 'var(--success)' },
    { initials: 'MD', name: 'Mike Developer', role: 'Developer', color: 'var(--purple)' },
    { initials: 'LT', name: 'Lisa Tester', role: 'Scrum Master', color: 'var(--orange)' }
  ];

  if (openTabs.length === 0) {
    return (
      <main className="editor-container">
        <div className="editor-empty-state">
          <div className="empty-state-content">
            <i className="fas fa-code"></i>
            <h3>No Files Open</h3>
            <p>Select a file from the repository to start editing</p>
            {currentRepository && (
              <p className="repo-info">
                Repository: <strong>{currentRepository.name}</strong>
              </p>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="editor-container">
      {/* Tab Bar */}
      <div className="tab-bar">
        {openTabs.map(tab => (
          <div 
            key={tab.path}
            className={`tab ${activeTab === tab.path ? 'active' : ''} ${tab.modified ? 'modified' : ''}`}
            onClick={() => setActiveTab(tab.path)}
          >
            <i className={tab.icon} style={{color: tab.color, marginRight: '8px'}}></i>
            <span>{tab.name}</span>
            {tab.modified && <span className="modified-indicator">●</span>}
            <i 
              className="fas fa-times tab-close"
              onClick={(e) => closeTab(tab.path, e)}
            ></i>
          </div>
        ))}
        
        {/* Save All Button */}
        {Object.values(unsavedChanges).some(changed => changed) && (
          <button 
            className="save-all-btn"
            onClick={saveAllFiles}
            title="Save All Files (Ctrl+Shift+S)"
            disabled={loading}
          >
            <i className="fas fa-save"></i>
            Save All
          </button>
        )}
      </div>

      {/* Editor */}
      <div className="editor">
        {/* File Info Bar */}
        {activeTab && (
          <div className="file-info-bar">
            <div className="file-path">
              <i className={getActiveTabInfo()?.icon}></i>
              <span>{activeTab}</span>
              {getSaveStatusIndicator(activeTab)}
            </div>
            <div className="file-actions">
              <button 
                className="btn btn-sm"
                onClick={() => saveFile()}
                disabled={!unsavedChanges[activeTab] || loading}
                title="Save File (Ctrl+S)"
              >
                <i className="fas fa-save"></i>
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        )}

        {/* User Presence Indicators */}
        <div className="presence-indicators">
          {presenceUsers.map(user => (
            <div 
              key={user.initials}
              className="presence-user" 
              style={{backgroundColor: user.color}}
              title={`${user.name} - ${user.role}`}
            >
              {user.initials}
            </div>
          ))}
        </div>

        {/* Code Link Indicator */}
        {selectedTask && (
          <div className="code-link-indicator" title={`Linked to ${selectedTask}`}></div>
        )}

        {/* Monaco Editor Container - takes remaining space */}
        <div className="monaco-editor-wrapper">
          <MonacoCodeEditor
            value={getCurrentFileContent()}
            onChange={handleContentChange}
            language={getLanguageFromPath(activeTab)}
            disabled={!activeTab}
            className="monaco-code-editor"
          />
        </div>
      </div>
    </main>
  );
};

export default Editor;
