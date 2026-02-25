import React from 'react';
import EditorComponent from './EditorComponent';

const MonacoCodeEditor = ({ 
  value, 
  onChange, 
  language, 
  disabled,
  className = '',
  // New props
  projectId,
  filePath
}) => {
  // We use the new real-time EditorComponent instead of the old local one.
  // Note: The parent component (Editor.js) currently manages file content state (fileContents)
  // and saves via HTTP. With Yjs, content is synced automatically via WebSocket.
  // We might need to adjust how the parent handles saves to avoid conflicts, or let Yjs handle persistence entirely.
  // For now, we'll render the new component.
  
  if (!projectId || !filePath) {
      // Fallback or loading state if props aren't ready
      return <div className="editor-loading">Initializing Editor...</div>;
  }

  return (
    <EditorComponent
      projectId={projectId}
      filePath={filePath}
      language={language}
      className={className}
    />
  );
};

export default MonacoCodeEditor;
