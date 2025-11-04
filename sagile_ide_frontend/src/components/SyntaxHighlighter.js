import React, { useEffect, useRef } from 'react';
import Prism from 'prismjs';

// Import core languages
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
import 'prismjs/components/prism-xml-doc';

// Import theme
import 'prismjs/themes/prism-tomorrow.css';

const SyntaxHighlighter = ({ code, language, className = '' }) => {
  const codeRef = useRef(null);

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
      'xml': 'xml',
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

  useEffect(() => {
    if (codeRef.current && code) {
      const prismLanguage = language || 'text';
      
      // Check if language is supported
      if (Prism.languages[prismLanguage]) {
        const highlighted = Prism.highlight(code, Prism.languages[prismLanguage], prismLanguage);
        codeRef.current.innerHTML = highlighted;
      } else {
        // Fallback to plain text
        codeRef.current.textContent = code;
      }
    }
  }, [code, language]);

  return (
    <pre className={`syntax-highlighter ${className}`}>
      <code 
        ref={codeRef}
        className={`language-${language || 'text'}`}
      >
        {code}
      </code>
    </pre>
  );
};

export default SyntaxHighlighter;
export { getLanguageFromExtension };
