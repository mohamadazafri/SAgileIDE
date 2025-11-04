import React, { useRef, useEffect, useState } from 'react';
import Prism from 'prismjs';

// Import languages
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-scss';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-markup';

// Import theme
import 'prismjs/themes/prism-tomorrow.css';

const CodeEditor = ({ 
  value, 
  onChange, 
  onMouseUp, 
  onKeyUp, 
  language, 
  placeholder,
  disabled,
  className = ''
}) => {
  const textareaRef = useRef(null);
  const highlightRef = useRef(null);
  const lineNumbersRef = useRef(null);
  const containerRef = useRef(null);
  const [highlightedCode, setHighlightedCode] = useState('');
  const [selection, setSelection] = useState({ start: 0, end: 0 });

  // Map file extensions to Prism language identifiers
  const getLanguageFromExtension = (ext) => {
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
    
    return languageMap[ext] || 'text';
  };

  // Highlight code using Prism
  const highlightCode = (code, lang) => {
    if (!code) return '';
    
    const prismLanguage = lang || 'text';
    
    try {
      if (Prism.languages[prismLanguage]) {
        return Prism.highlight(code, Prism.languages[prismLanguage], prismLanguage);
      }
    } catch (error) {
      console.warn('Syntax highlighting error:', error);
    }
    
    // Fallback to escaped plain text
    return code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };

  // Update highlighted code when value or language changes
  useEffect(() => {
    const highlighted = highlightCode(value, language);
    setHighlightedCode(highlighted);
  }, [value, language]);

  // Sync scroll between textarea, highlight overlay, and line numbers
  const handleScroll = () => {
    if (textareaRef.current) {
      const scrollTop = textareaRef.current.scrollTop;
      const scrollLeft = textareaRef.current.scrollLeft;
      
      if (highlightRef.current) {
        highlightRef.current.scrollTop = scrollTop;
        highlightRef.current.scrollLeft = scrollLeft;
      }
      
      if (lineNumbersRef.current) {
        lineNumbersRef.current.scrollTop = scrollTop;
      }
    }
  };

  // Handle textarea changes
  const handleChange = (e) => {
    if (onChange) {
      onChange(e.target.value);
    }
  };

  // Handle mouse events and track selection
  const handleMouseUp = (e) => {
    updateSelection(e.target);
    if (onMouseUp) {
      onMouseUp(e);
    }
  };

  // Handle selection changes
  const handleSelectionChange = (e) => {
    updateSelection(e.target);
  };

  // Update selection state
  const updateSelection = (textarea) => {
    if (textarea) {
      setSelection({
        start: textarea.selectionStart,
        end: textarea.selectionEnd
      });
    }
  };

  // Handle keyboard events
  const handleKeyUp = (e) => {
    updateSelection(e.target);
    if (onKeyUp) {
      onKeyUp(e);
    }
  };

  // Handle special key presses (Tab, Enter, etc.)
  const handleKeyDown = (e) => {
    // Handle Tab key
    if (e.key === 'Tab') {
      e.preventDefault();
      
      const textarea = e.target;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentValue = textarea.value;
      
      if (e.shiftKey) {
        // Shift+Tab: Remove indentation
        const lineStart = currentValue.lastIndexOf('\n', start - 1) + 1;
        const lineEnd = currentValue.indexOf('\n', start);
        const actualLineEnd = lineEnd === -1 ? currentValue.length : lineEnd;
        const line = currentValue.substring(lineStart, actualLineEnd);
        
        if (line.startsWith('  ')) {
          // Remove 2 spaces
          const newValue = currentValue.substring(0, lineStart) + 
                          line.substring(2) + 
                          currentValue.substring(actualLineEnd);
          
          if (onChange) {
            onChange(newValue);
          }
          
          // Update cursor position
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = Math.max(lineStart, start - 2);
          }, 0);
        }
      } else {
        // Tab: Add indentation (2 spaces)
        const newValue = currentValue.substring(0, start) + 
                        '  ' + 
                        currentValue.substring(end);
        
        if (onChange) {
          onChange(newValue);
        }
        
        // Update cursor position
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 2;
        }, 0);
      }
    }
    
    // Handle Enter key for auto-indentation
    else if (e.key === 'Enter') {
      e.preventDefault();
      
      const textarea = e.target;
      const start = textarea.selectionStart;
      const currentValue = textarea.value;
      
      // Find the current line to determine indentation
      const lineStart = currentValue.lastIndexOf('\n', start - 1) + 1;
      const currentLine = currentValue.substring(lineStart, start);
      
      // Count leading spaces for indentation
      const indentMatch = currentLine.match(/^(\s*)/);
      const currentIndent = indentMatch ? indentMatch[1] : '';
      
      // Check if we need extra indentation (after {, [, (, etc.)
      const lastChar = currentLine.trim().slice(-1);
      const extraIndent = ['{', '[', '('].includes(lastChar) ? '  ' : '';
      
      const newValue = currentValue.substring(0, start) + 
                      '\n' + currentIndent + extraIndent + 
                      currentValue.substring(start);
      
      if (onChange) {
        onChange(newValue);
      }
      
      // Update cursor position
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 1 + currentIndent.length + extraIndent.length;
      }, 0);
    }
    
    // Handle auto-closing brackets, quotes, etc.
    else if (['(', '[', '{', '"', "'", '`'].includes(e.key)) {
      const textarea = e.target;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentValue = textarea.value;
      
      // Define closing pairs
      const closingPairs = {
        '(': ')',
        '[': ']',
        '{': '}',
        '"': '"',
        "'": "'",
        '`': '`'
      };
      
      const closingChar = closingPairs[e.key];
      
      if (start === end) {
        // No selection, just insert the pair
        e.preventDefault();
        
        const newValue = currentValue.substring(0, start) + 
                        e.key + closingChar + 
                        currentValue.substring(end);
        
        if (onChange) {
          onChange(newValue);
        }
        
        // Position cursor between the pair
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 1;
        }, 0);
      } else {
        // Text is selected, wrap it with the pair
        e.preventDefault();
        
        const selectedText = currentValue.substring(start, end);
        const newValue = currentValue.substring(0, start) + 
                        e.key + selectedText + closingChar + 
                        currentValue.substring(end);
        
        if (onChange) {
          onChange(newValue);
        }
        
        // Select the wrapped text
        setTimeout(() => {
          textarea.selectionStart = start + 1;
          textarea.selectionEnd = end + 1;
        }, 0);
      }
    }
    
    // Handle closing brackets - skip if next character is the same
    else if ([')', ']', '}'].includes(e.key)) {
      const textarea = e.target;
      const start = textarea.selectionStart;
      const currentValue = textarea.value;
      
      if (currentValue.charAt(start) === e.key) {
        e.preventDefault();
        
        // Just move cursor forward
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 1;
        }, 0);
      }
    }
  };

  // Generate line numbers
  const getLineNumbers = () => {
    const lines = (value || '').split('\n');
    return lines.map((_, index) => index + 1);
  };

  return (
    <div className={`code-editor-container ${className}`} ref={containerRef}>
      {/* Line numbers */}
      <div className="line-numbers" ref={lineNumbersRef} aria-hidden="true">
        {getLineNumbers().map(lineNumber => (
          <div key={lineNumber} className="line-number">
            {lineNumber}
          </div>
        ))}
      </div>
      
      {/* Code content area */}
      <div className="code-content-area">
        {/* Syntax highlighted background */}
        <pre 
          ref={highlightRef}
          className="code-highlight-overlay"
          aria-hidden="true"
        >
          <code 
            className={`language-${language || 'text'}`}
            dangerouslySetInnerHTML={{ __html: highlightedCode }}
          />
        </pre>
        
        {/* Editable textarea */}
        <textarea
          ref={textareaRef}
          className="code-editor-textarea"
          value={value}
          onChange={handleChange}
          onScroll={handleScroll}
          onMouseUp={handleMouseUp}
          onMouseDown={handleSelectionChange}
          onKeyUp={handleKeyUp}
          onKeyDown={handleKeyDown}
          onSelect={handleSelectionChange}
          placeholder={placeholder}
          disabled={disabled}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
        />
      </div>
    </div>
  );
};

export default CodeEditor;
