import React, { useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { useSettings } from '../context/SettingsContext';
import { useTheme } from '../context/ThemeContext';

// Removed manual loader config to allow default behavior


const MonacoCodeEditor = ({ 
  value, 
  onChange, 
  language, 
  disabled,
  className = ''
}) => {
  const { settings } = useSettings();
  const { theme } = useTheme();
  const editorRef = useRef(null);
  const monacoRef = useRef(null);

  const getMonacoLanguage = (lang) => {
    const map = {
      'js': 'javascript', 'jsx': 'javascript', 'ts': 'typescript', 'tsx': 'typescript',
      'py': 'python', 'rb': 'ruby', 'cs': 'csharp', 'go': 'go', 'java': 'java',
      'html': 'html', 'css': 'css', 'json': 'json', 'md': 'markdown', 'sql': 'sql'
    };
    return map[lang?.toLowerCase()] || lang || 'plaintext';
  };

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Custom keybinding for Save (Ctrl+S / Cmd+S)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      window.dispatchEvent(new CustomEvent('monaco-save'));
    });

    // Selection change listener
    editor.onDidChangeCursorSelection((e) => {
      const selection = editor.getModel()?.getValueInRange(e.selection);
      if (selection) {
        window.dispatchEvent(new CustomEvent('monaco-selection', { detail: selection }));
      }
    });
  };

  const handleEditorChange = (newValue) => {
    if (onChange) onChange(newValue);
  };

  // Prepare options - Minimal and Clean
  const options = {
    readOnly: disabled,
    fontSize: settings.fontSize || 14,
    lineHeight: 0, // Force integer line height (1.5 * 14)
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
        value={value || ''}
        theme={theme === 'dark' ? 'vs-dark' : 'light'}
        options={options}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        loading={<div style={{padding: '20px'}}>Loading Editor...</div>}
      />
    </div>
  );
};

export default MonacoCodeEditor;
