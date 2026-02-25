import React from 'react';
import EditorComponent from './EditorComponent';

const CodeEditor = ({ 
  value, 
  onChange, 
  onMouseUp, 
  onKeyUp, 
  language, 
  placeholder,
  disabled,
  className = '',
  // New props for real-time collaboration
  projectId,
  filePath
}) => {
  // If we don't have projectId/filePath, we might want to fall back to a read-only or basic view,
  // or just render the EditorComponent anyway if it can handle missing props gracefully.
  // For now, we assume this component is used in a context where real-time editing is desired.
  
  // Note: CodeEditor was previously a wrapper around a textarea/Prism.
  // We are replacing it with EditorComponent which wraps Monaco + Yjs.
  
  // Important: The old CodeEditor handled 'value' and 'onChange' for controlled input.
  // The new EditorComponent uses Yjs for state, so 'value' prop might only be used for initialization if at all.
  // 'onChange' might still be useful for parent component to know about updates (e.g. for autosave triggers in parent),
  // but the real-time sync handles the actual content.

  return (
    <EditorComponent
      projectId={projectId}
      filePath={filePath}
      language={language}
      className={className}
      // Pass other props if EditorComponent needs them or if we extend it
    />
  );
};

export default CodeEditor;
