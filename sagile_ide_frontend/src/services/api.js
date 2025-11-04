// API service for SAgile IDE backend communication

const API_BASE_URL = '/api'; // Use relative URL for proxy

// Session-based authentication - no token storage needed

// Get default headers for API requests
const getHeaders = () => {
  return {
    'Content-Type': 'application/json',
  };
};

// Generic API request function
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: getHeaders(),
    credentials: 'include', // Include cookies for session authentication
    ...options,
  };
  
  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    // Handle responses with no content (like HTTP 204)
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API request failed for ${endpoint}:`, error);
    throw error;
  }
};

// Authentication API
export const authAPI = {
  // User registration
  register: async (userData) => {
    return apiRequest('/auth/register/', {
      method: 'POST',
      body: JSON.stringify(userData),
      includeAuth: false,
    });
  },
  
  // User login
  login: async (credentials) => {
    const response = await apiRequest('/auth/login/', {
      method: 'POST',
      body: JSON.stringify(credentials),
      includeAuth: false,
    });
    
    // For session authentication, we don't need to store a token
    // The session is maintained by cookies
    
    return response;
  },
  
  // User logout
  logout: async () => {
    try {
      await apiRequest('/auth/logout/', {
        method: 'POST',
      });
    } finally {
      // Session is cleared by backend, no local storage to clear
    }
  },
  
  // Get current user
  getCurrentUser: async () => {
    return apiRequest('/auth/current/');
  },
};

// Projects API
export const projectsAPI = {
  // Get user's projects
  getMyProjects: async () => {
    return apiRequest('/projects/my-projects/');
  },
  
  // Get all projects (for project managers)
  getAllProjects: async () => {
    return apiRequest('/projects/');
  },
  
  // Get project by ID
  getProject: async (projectId) => {
    return apiRequest(`/projects/${projectId}/`);
  },
  
  // Get project members
  getProjectMembers: async (projectId) => {
    return apiRequest(`/projects/${projectId}/members/`);
  },
  
  // Search projects
  searchProjects: async (query) => {
    return apiRequest(`/projects/search/?q=${encodeURIComponent(query)}`);
  },
};

// Repositories API
export const repositoriesAPI = {
  // Get user's repositories
  getMyRepositories: async () => {
    return apiRequest('/repositories/');
  },
  
  // Create repository
  createRepository: async (repositoryData) => {
    return apiRequest('/repositories/', {
      method: 'POST',
      body: JSON.stringify(repositoryData),
    });
  },
  
  // Get repository by ID
  getRepository: async (repositoryId) => {
    return apiRequest(`/repositories/${repositoryId}/`);
  },
  
  // Get repository by project
  getRepositoryByProject: async (projectId) => {
    return apiRequest(`/repositories/by-project/${projectId}/`);
  },
  
  // Update repository
  updateRepository: async (repositoryId, updateData) => {
    return apiRequest(`/repositories/${repositoryId}/`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    });
  },
  
  // Get repository files
  getRepositoryFiles: async (repositoryId) => {
    return apiRequest(`/repositories/${repositoryId}/files/`);
  },
  
  // Add file to repository
  addFile: async (repositoryId, fileData) => {
    return apiRequest(`/repositories/${repositoryId}/add-file/`, {
      method: 'POST',
      body: JSON.stringify(fileData),
    });
  },
  
  // Update file in repository (for renaming and content updates)
  updateFile: async (repositoryId, filePath, fileData) => {
    return apiRequest(`/repositories/${repositoryId}/files/${filePath}/update/`, {
      method: 'PUT',
      body: JSON.stringify(fileData),
    });
  },
  
  // Remove file from repository
  removeFile: async (repositoryId, filePath) => {
    return apiRequest(`/repositories/${repositoryId}/files/${filePath}/delete/`, {
      method: 'DELETE',
    });
  },
  
  // Template management
  getProjectTemplates: async () => {
    return apiRequest('/repositories/templates/');
  },
  
  getTemplatePreview: async (templateId) => {
    return apiRequest(`/repositories/templates/${templateId}/preview/`);
  },
  
  createCustomTemplate: async (templateData) => {
    return apiRequest('/repositories/templates/create/', {
      method: 'POST',
      body: JSON.stringify(templateData),
    });
  },
};

// Tasks API
export const tasksAPI = {
  // Get user's tasks
  getMyTasks: async () => {
    return apiRequest('/tasks/my-tasks/');
  },
  
  // Get tasks by project
  getTasksByProject: async (projectId) => {
    return apiRequest(`/tasks/by-project/${projectId}/`);
  },
  
  // Create task
  createTask: async (taskData) => {
    return apiRequest('/tasks/', {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
  },
  
  // Get task by ID
  getTask: async (taskId) => {
    return apiRequest(`/tasks/${taskId}/`);
  },
  
  // Update task
  updateTask: async (taskId, updateData) => {
    return apiRequest(`/tasks/${taskId}/`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    });
  },
  
  // Add code link to task
  addCodeLink: async (taskId, codeLinkData) => {
    return apiRequest(`/tasks/${taskId}/add-code-link/`, {
      method: 'POST',
      body: JSON.stringify(codeLinkData),
    });
  },
  
  // Add comment to task
  addComment: async (taskId, commentData) => {
    return apiRequest(`/tasks/${taskId}/add-comment/`, {
      method: 'POST',
      body: JSON.stringify(commentData),
    });
  },
  
  // Update task progress
  updateProgress: async (taskId, progressData) => {
    return apiRequest(`/tasks/${taskId}/update-progress/`, {
      method: 'POST',
      body: JSON.stringify(progressData),
    });
  },
  
  // Search tasks
  searchTasks: async (query) => {
    return apiRequest(`/tasks/search/?q=${encodeURIComponent(query)}`);
  },
};

// Utility functions
export const apiUtils = {
  isAuthenticated: async () => {
    // For session authentication, we need to check with the server
    try {
      await apiRequest('/auth/current/');
      return true;
    } catch {
      return false;
    }
  },
};

export default {
  auth: authAPI,
  projects: projectsAPI,
  repositories: repositoriesAPI,
  tasks: tasksAPI,
  utils: apiUtils,
};
