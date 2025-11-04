import React, { useState, useEffect } from 'react';
import { projectsAPI } from '../services/api';

const ProjectSelection = ({ selectedProject, onProjectChange }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch projects from backend
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const data = await projectsAPI.getMyProjects();
        setProjects(data.projects || []);
      } catch (err) {
        console.error('Error fetching projects:', err);
        setError(err.message);
        // Fallback to mock data if API fails
        setProjects([
          {
            id: "PROJ-2025-001",
            sagile_id: "PROJ-2025-001",
            name: "E-Commerce Platform",
            member_count_display: "8 members",
            current_sprint: "Sprint 3 (Week 2)",
            repository_status: "No repository created",
            has_repository: false
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const handleProjectChange = (e) => {
    const projectId = e.target.value;
    const project = projects.find(p => p.id === projectId);
    onProjectChange(project || null);
  };

  // Filter projects that don't have repositories yet
  const availableProjects = projects.filter(project => !project.has_repository);

  if (loading) {
    return (
      <section className="project-selection">
        <h2 className="section-title">
          <i className="fas fa-project-diagram"></i>
          Select SAgile Project
        </h2>
        <div className="loading-message">
          <i className="fas fa-spinner fa-spin"></i>
          Loading projects...
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="project-selection">
        <h2 className="section-title">
          <i className="fas fa-project-diagram"></i>
          Select SAgile Project
        </h2>
        <div className="error-message">
          <i className="fas fa-exclamation-triangle"></i>
          Error loading projects: {error}
        </div>
      </section>
    );
  }

  return (
    <section className="project-selection">
      <h2 className="section-title">
        <i className="fas fa-project-diagram"></i>
        Select SAgile Project
      </h2>

      {availableProjects.length === 0 ? (
        <div className="no-projects-message">
          <i className="fas fa-info-circle"></i>
          <p>No projects available for repository creation. All your projects already have repositories.</p>
        </div>
      ) : (
        <>
          <select
            className="project-dropdown"
            value={selectedProject?.id || ""}
            onChange={handleProjectChange}
          >
            <option value="">Select a SAgile project...</option>
            {availableProjects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name} ({project.sagile_id})
              </option>
            ))}
          </select>

          {selectedProject && (
            <div className="project-info">
              <div className="project-detail">
                <span className="project-detail-label">Project ID:</span>
                <span className="project-detail-value">{selectedProject.sagile_id}</span>
              </div>
              <div className="project-detail">
                <span className="project-detail-label">Team Members:</span>
                <span className="project-detail-value">{selectedProject.member_count_display}</span>
              </div>
              <div className="project-detail">
                <span className="project-detail-label">Current Sprint:</span>
                <span className="project-detail-value">{selectedProject.current_sprint}</span>
              </div>
              <div className="project-detail">
                <span className="project-detail-label">Repository Status:</span>
                <span 
                  className="project-detail-value" 
                  style={{ 
                    color: selectedProject.has_repository ? 'var(--success)' : 'var(--warning)' 
                  }}
                >
                  {selectedProject.repository_status}
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default ProjectSelection;
