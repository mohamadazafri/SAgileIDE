import React, { useRef, useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';
import { useSettings } from '../context/SettingsContext';
import { useTheme } from '../context/ThemeContext';

const EditorComponent = ({ 
  projectId, 
  filePath, 
  language = 'javascript', 
  className = '' 
}) => {
  const { settings } = useSettings();
  const { theme } = useTheme();
  const editorRef = useRef(null);
  const providerRef = useRef(null);
  const bindingRef = useRef(null);
  
  // Clean up on unmount or prop change
  useEffect(() => {
    return () => {
      if (bindingRef.current) {
        bindingRef.current.destroy();
      }
      if (providerRef.current) {
        providerRef.current.disconnect();
        providerRef.current.destroy();
      }
    };
  }, [projectId, filePath]);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;

    // 1. Initialize Yjs Doc
    const doc = new Y.Doc();
    
    // 2. Configure Websocket Provider
    // Assuming backend is running on localhost:8000. 
    // In production, this should come from env or config.
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = 'localhost:8000'; 
    const serverUrl = `${wsProtocol}//${wsHost}/ws/editor`;
    
    // Room name constructs the URL path
    const roomName = `${projectId}/${filePath}`;
    
    const provider = new WebsocketProvider(
      serverUrl,
      roomName,
      doc
    );
    providerRef.current = provider;

    // 3. Bind Yjs to Monaco
    const type = doc.getText('monaco');
    
    const binding = new MonacoBinding(
      type,
      editor.getModel(),
      new Set([editor]),
      provider.awareness
    );
    bindingRef.current = binding;
    
    // Optional: Set user info for cursors
    // provider.awareness.setLocalStateField('user', {
    //   name: 'Anonymous',
    //   color: '#' + Math.floor(Math.random() * 16777215).toString(16)
    // });
    
    // Handle status updates
    provider.on('status', event => {
      console.log('Websocket status:', event.status); // 'connected' or 'disconnected'
    });
  };

  const getMonacoLanguage = (lang) => {
    const map = {
      'js': 'javascript', 'jsx': 'javascript', 'ts': 'typescript', 'tsx': 'typescript',
      'py': 'python', 'rb': 'ruby', 'cs': 'csharp', 'go': 'go', 'java': 'java',
      'html': 'html', 'css': 'css', 'json': 'json', 'md': 'markdown', 'sql': 'sql',
      'cpp': 'cpp', 'c': 'c'
    };
    return map[lang?.toLowerCase()] || lang || 'plaintext';
  };

  const options = {
    readOnly: false,
    fontSize: settings.fontSize || 14,
    lineHeight: 0, 
    tabSize: settings.tabSize || 2,
    wordWrap: settings.wordWrap ? 'on' : 'off',
    minimap: { enabled: false },
    automaticLayout: true,
    scrollBeyondLastLine: false,
    lineNumbers: 'on',
    glyphMargin: false,
    folding: true,
    fontFamily: "'Fira Code', Consolas, monospace",
    fontLigatures: true,
    padding: { top: 10, bottom: 10 }, 
  };

  return (
    <div className={`monaco-wrapper ${className}`} style={{ height: '100%', width: '100%', overflow: 'hidden' }}>
      <Editor
        height="100%"
        width="100%"
        language={getMonacoLanguage(language)}
        theme={theme === 'dark' ? 'vs-dark' : 'light'}
        options={options}
        onMount={handleEditorDidMount}
        loading={<div style={{padding: '20px'}}>Loading Editor...</div>}
      />
    </div>
  );
};

export default EditorComponent;

