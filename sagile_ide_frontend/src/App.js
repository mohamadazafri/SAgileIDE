import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './styles/App.css';
import RepositoryHeader from './components/RepositoryHeader';
import RepositoryCreation from './components/RepositoryCreation';
import RepositoryDashboard from './components/RepositoryDashboard';
import Login from './components/Login';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import LeftPanel from './components/LeftPanel';
import Editor from './components/Editor';
import RightPanel from './components/RightPanel';
import StatusBar from './components/StatusBar';
import { apiUtils, repositoriesAPI } from './services/api';
import { useLocation } from 'react-router-dom';

// IDE Workspace Component
const IDEWorkspace = () => {
  const location = useLocation();
  const [activePanel, setActivePanel] = useState('tasks');
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedCode, setSelectedCode] = useState(null);
  const [userRole, setUserRole] = useState('scrum-master'); // For role-based features
  const [currentRepository, setCurrentRepository] = useState(null);
  const [allRepositories, setAllRepositories] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [refreshFileTree, setRefreshFileTree] = useState(0);

  // Load repository data on component mount
  useEffect(() => {
    const loadWorkspaceData = async () => {
      try {
        // Get repository from navigation state or load default
        const repositoryFromState = location.state?.repository;
        
        // Load all repositories for dropdown
        const response = await repositoriesAPI.getMyRepositories();
        const repos = response.repositories || [];
        setAllRepositories(repos);
        
        // Set current repository
        if (repositoryFromState) {
          setCurrentRepository(repositoryFromState);
        } else if (repos.length > 0) {
          // Default to first repository if none specified
          setCurrentRepository(repos[0]);
        }
      } catch (error) {
        console.error('Error loading workspace data:', error);
      }
    };

    loadWorkspaceData();
  }, [location.state]);

  const handlePanelSwitch = (panel) => {
    setActivePanel(panel);
  };

  const handleTaskSelect = (taskId) => {
    setSelectedTask(taskId);
  };

  const handleCodeSelection = (selection) => {
    setSelectedCode(selection);
  };

  const handleRepositoryChange = (repository) => {
    setCurrentRepository(repository);
    setSelectedFile(null); // Clear selected file when switching repositories
  };

  const handleFileSelect = (file) => {
    setSelectedFile(file);
    // Auto-switch to files panel when a file is selected
    if (activePanel !== 'files') {
      setActivePanel('files');
    }
  };

  const handleFileContentUpdated = () => {
    // Trigger file tree refresh by incrementing the refresh counter
    setRefreshFileTree(prev => prev + 1);
  };

  return (
    <div className={`app ide-workspace user-role-${userRole}`}>
      <Header 
        currentRepository={currentRepository}
        allRepositories={allRepositories}
        onRepositoryChange={handleRepositoryChange}
      />
      <div className="main-container">
        <Sidebar 
          activePanel={activePanel} 
          onPanelSwitch={handlePanelSwitch}
        />
        <LeftPanel 
          activePanel={activePanel}
          selectedTask={selectedTask}
          onTaskSelect={handleTaskSelect}
          selectedCode={selectedCode}
          currentRepository={currentRepository}
          onFileSelect={handleFileSelect}
          selectedFile={selectedFile}
          refreshTrigger={refreshFileTree}
        />
        <Editor 
          onCodeSelection={handleCodeSelection}
          selectedTask={selectedTask}
          selectedFile={selectedFile}
          currentRepository={currentRepository}
          onFileContentUpdated={handleFileContentUpdated}
        />
        <RightPanel />
      </div>
      <StatusBar selectedTask={selectedTask} />
    </div>
  );
};

// Repository Creation Page Component
const RepositoryCreationPage = () => {
  return (
    <div className="app">
      <RepositoryHeader />
      <RepositoryCreation />
    </div>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authenticated = await apiUtils.isAuthenticated();
        setIsAuthenticated(authenticated);
      } catch (error) {
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/repositories" replace />} />
        <Route path="/login" element={<Login />} />
        <Route 
          path="/repositories" 
          element={
            <ProtectedRoute>
              <RepositoryDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/create-repository" 
          element={
            <ProtectedRoute>
              <RepositoryCreationPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/workspace" 
          element={
            <ProtectedRoute>
              <IDEWorkspace />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;
