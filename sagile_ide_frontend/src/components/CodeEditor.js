import React, { useRef, useEffect, useState } from 'react';
import Prism from 'prismjs';
import { useSettings } from '../context/SettingsContext';

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
  const { settings } = useSettings();
  const textareaRef = useRef(null);
  const highlightRef = useRef(null);
  const lineNumbersRef = useRef(null);
  const containerRef = useRef(null);
  const searchLayerRef = useRef(null);
  const [highlightedCode, setHighlightedCode] = useState('');
  const [selection, setSelection] = useState({ start: 0, end: 0 });

  // Search state
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [searchMatches, setSearchMatches] = useState([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);

  // Go To Line state
  const [showGoToLine, setShowGoToLine] = useState(false);
  const [goToLineNumber, setGoToLineNumber] = useState('');
  
  // Track if last copy/cut was a full line
  const lastClipboardAction = useRef({ isFullLine: false });

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
    return escapeHtml(code);
  };

  const escapeHtml = (text) => {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  // Search Logic
  useEffect(() => {
    if (!searchQuery || !value) {
      setSearchMatches([]);
      setCurrentMatchIndex(-1);
      return;
    }

    try {
      // Escape special regex characters if the user isn't using regex mode (we default to plain text search for now)
      // or support regex if we add a toggle. For now, let's do literal search by escaping.
      const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedQuery, 'gi');
      
      const matches = [];
      let match;
      while ((match = regex.exec(value)) !== null) {
        matches.push({
          start: match.index,
          end: match.index + match[0].length
        });
      }
      
      setSearchMatches(matches);
      
      // Maintain current index relative position or reset
      if (matches.length > 0) {
        if (currentMatchIndex === -1 || currentMatchIndex >= matches.length) {
          setCurrentMatchIndex(0);
        }
      } else {
        setCurrentMatchIndex(-1);
      }
    } catch (e) {
      console.error("Search error:", e);
    }
  }, [searchQuery, value]);

  // Generate search highlight HTML
  const getSearchOverlayHtml = () => {
    if (!searchMatches.length || !value) return '';

    let html = '';
    let lastIndex = 0;

    searchMatches.forEach((match, index) => {
      // Append text before match
      html += escapeHtml(value.substring(lastIndex, match.start));
      
      // Append matched text
      const isCurrent = index === currentMatchIndex;
      const className = isCurrent ? 'search-match current' : 'search-match';
      html += `<span class="${className}">${escapeHtml(value.substring(match.start, match.end))}</span>`;
      
      lastIndex = match.end;
    });

    // Append remaining text
    html += escapeHtml(value.substring(lastIndex));

    return html;
  };

  // Update highlighted code when value or language changes
  useEffect(() => {
    const highlighted = highlightCode(value, language);
    setHighlightedCode(highlighted);
  }, [value, language]);

  // Sync scroll between textarea, highlight overlay, search overlay, and line numbers
  const handleScroll = () => {
    if (textareaRef.current) {
      const scrollTop = textareaRef.current.scrollTop;
      const scrollLeft = textareaRef.current.scrollLeft;
      
      if (highlightRef.current) {
        highlightRef.current.scrollTop = scrollTop;
        highlightRef.current.scrollLeft = scrollLeft;
      }

      if (searchLayerRef.current) {
        searchLayerRef.current.scrollTop = scrollTop;
        searchLayerRef.current.scrollLeft = scrollLeft;
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

  const nextMatch = () => {
    if (searchMatches.length === 0) return;
    const nextIndex = (currentMatchIndex + 1) % searchMatches.length;
    setCurrentMatchIndex(nextIndex);
    scrollToMatch(nextIndex);
  };

  const prevMatch = () => {
    if (searchMatches.length === 0) return;
    const prevIndex = (currentMatchIndex - 1 + searchMatches.length) % searchMatches.length;
    setCurrentMatchIndex(prevIndex);
    scrollToMatch(prevIndex);
  };

  const scrollToMatch = (index) => {
    const match = searchMatches[index];
    if (match && textareaRef.current) {
      // Simple scroll to position logic is hard with dual overlays, 
      // but we can try to set selection range which usually forces scroll.
      // However, setting selection disrupts editing flow if user didn't want to move cursor.
      // For search navigation, moving cursor to match is expected behavior.
      
      textareaRef.current.selectionStart = match.start;
      textareaRef.current.selectionEnd = match.end;
      textareaRef.current.focus();
    }
  };

  const replace = () => {
    if (currentMatchIndex === -1 || !searchMatches[currentMatchIndex]) return;
    
    const match = searchMatches[currentMatchIndex];
    const newValue = value.substring(0, match.start) + replaceQuery + value.substring(match.end);
    
    onChange(newValue);
    // Effect will run, find matches again. 
    // We might lose track of "next" match index, but usually it just shifts.
  };

  const replaceAll = () => {
    if (!searchQuery) return;
    const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedQuery, 'gi');
    const newValue = value.replace(regex, replaceQuery);
    onChange(newValue);
  };

  // Go To Line Logic
  const handleGoToLine = () => {
    const line = parseInt(goToLineNumber, 10);
    if (isNaN(line) || line < 1) return;
    
    const lines = value.split('\n');
    if (line > lines.length) return; // Or clamp to max
    
    // Calculate character index for the start of the line
    let charIndex = 0;
    for (let i = 0; i < line - 1; i++) {
      charIndex += lines[i].length + 1; // +1 for newline
    }
    
    if (textareaRef.current) {
      textareaRef.current.selectionStart = charIndex;
      textareaRef.current.selectionEnd = charIndex;
      textareaRef.current.focus();
      
      // Try to scroll line into view - simplistic approach
      // Since we focused and set selection, browser usually scrolls it into view automatically.
      // If we need precise centering, we'd need to calculate line height * line number and set scrollTop.
      const lineHeight = 21; // Approximate line height in px
      textareaRef.current.scrollTop = (line - 1) * lineHeight - (textareaRef.current.clientHeight / 2);
    }
    
    setShowGoToLine(false);
    setGoToLineNumber('');
  };

  // Handle special key presses (Tab, Enter, etc.)
  const handleKeyDown = (e) => {
    // Handle Ctrl+F for search
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      setShowSearch(true);
      setShowGoToLine(false);
      return;
    }

    // Handle Ctrl+G for Go To Line
    if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
      e.preventDefault();
      setShowGoToLine(true);
      setShowSearch(false);
      return;
    }

    // Handle Ctrl+D for selecting next occurrence (with Shift for all occurrences)
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
      e.preventDefault();
      
      const textarea = textareaRef.current;
      if (!textarea) return;
      
      const currentValue = textarea.value;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      
      // Get the currently selected text or word under cursor
      let searchText = '';
      let currentSelectionStart = start;
      let currentSelectionEnd = end;
      
      if (start !== end) {
        // Already have selection
        searchText = currentValue.substring(start, end);
      } else {
        // No selection - select word under cursor
        const wordBoundaryRegex = /\w/;
        let wordStart = start;
        let wordEnd = start;
        
        // Find word start
        while (wordStart > 0 && wordBoundaryRegex.test(currentValue.charAt(wordStart - 1))) {
          wordStart--;
        }
        
        // Find word end
        while (wordEnd < currentValue.length && wordBoundaryRegex.test(currentValue.charAt(wordEnd))) {
          wordEnd++;
        }
        
        if (wordStart < wordEnd) {
          searchText = currentValue.substring(wordStart, wordEnd);
          currentSelectionStart = wordStart;
          currentSelectionEnd = wordEnd;
          
          // Select the word
          textarea.selectionStart = wordStart;
          textarea.selectionEnd = wordEnd;
          return;
        } else {
          return; // No word under cursor
        }
      }
      
      // Check if Shift is held for "select all occurrences"
      if (e.shiftKey) {
        // Select all occurrences using search & replace widget
        setSearchQuery(searchText);
        setShowSearch(true);
        setShowGoToLine(false);
        return;
      }
      
      // Find next occurrence after current selection
      const nextIndex = currentValue.indexOf(searchText, currentSelectionEnd);
      
      if (nextIndex !== -1) {
        // Select next occurrence
        textarea.selectionStart = nextIndex;
        textarea.selectionEnd = nextIndex + searchText.length;
        
        // Scroll to selection if needed
        const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight);
        const linesBeforeSelection = currentValue.substring(0, nextIndex).split('\n').length;
        const scrollTop = (linesBeforeSelection - 1) * lineHeight - (textarea.clientHeight / 2);
        textarea.scrollTop = Math.max(0, scrollTop);
      } else {
        // Wrap around to beginning
        const firstIndex = currentValue.indexOf(searchText);
        if (firstIndex !== -1 && firstIndex < currentSelectionStart) {
          textarea.selectionStart = firstIndex;
          textarea.selectionEnd = firstIndex + searchText.length;
          
          // Scroll to selection
          const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight);
          const linesBeforeSelection = currentValue.substring(0, firstIndex).split('\n').length;
          const scrollTop = (linesBeforeSelection - 1) * lineHeight - (textarea.clientHeight / 2);
          textarea.scrollTop = Math.max(0, scrollTop);
        }
      }
      
      return;
    }

    // Handle Esc to close widgets
    if (e.key === 'Escape') {
      if (showSearch) {
        e.preventDefault();
        setShowSearch(false);
        textareaRef.current?.focus();
      }
      if (showGoToLine) {
        e.preventDefault();
        setShowGoToLine(false);
        textareaRef.current?.focus();
      }
      return;
    }

    // Handle Tab key
    if (e.key === 'Tab') {
      e.preventDefault();
      
      const textarea = e.target;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentValue = textarea.value;
      
      const tabSpaces = ' '.repeat(settings.tabSize);
      const tabRegex = new RegExp(`^${' '.repeat(settings.tabSize)}`);
      
      if (e.shiftKey) {
        // Shift+Tab: Remove indentation
        const lineStart = currentValue.lastIndexOf('\n', start - 1) + 1;
        const lineEnd = currentValue.indexOf('\n', start);
        const actualLineEnd = lineEnd === -1 ? currentValue.length : lineEnd;
        const line = currentValue.substring(lineStart, actualLineEnd);
        
        if (tabRegex.test(line)) {
          // Remove configured tab spaces
          const newValue = currentValue.substring(0, lineStart) + 
                          line.substring(settings.tabSize) + 
                          currentValue.substring(actualLineEnd);
          
          if (onChange) {
            onChange(newValue);
          }
          
          // Update cursor position
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = Math.max(lineStart, start - settings.tabSize);
          }, 0);
        }
      } else {
        // Tab: Add indentation (using configured tab size)
        const newValue = currentValue.substring(0, start) + 
                        tabSpaces + 
                        currentValue.substring(end);
        
        if (onChange) {
          onChange(newValue);
        }
        
        // Update cursor position
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + settings.tabSize;
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
      const extraIndent = ['{', '[', '('].includes(lastChar) ? ' '.repeat(settings.tabSize) : '';
      
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

  // Enhanced clipboard handling
  const handleCopy = (e) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    if (start === end) {
      // No selection - copy entire line
      const lines = (value || '').split('\n');
      const currentPos = start;
      let lineStart = 0;
      let lineIndex = 0;
      
      for (let i = 0; i < lines.length; i++) {
        const lineEnd = lineStart + lines[i].length;
        if (currentPos >= lineStart && currentPos <= lineEnd + 1) {
          lineIndex = i;
          break;
        }
        lineStart = lineEnd + 1;
      }
      
      const lineToCopy = lines[lineIndex] + '\n';
      
      // Copy to clipboard
      e.preventDefault();
      e.clipboardData.setData('text/plain', lineToCopy);
      
      // Mark as full line copy
      lastClipboardAction.current = { isFullLine: true };
    } else {
      // Selection exists - mark as partial copy
      lastClipboardAction.current = { isFullLine: false };
    }
    // If there's a selection, default browser behavior handles it
  };

  const handleCut = (e) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    if (start === end) {
      // No selection - cut entire line
      const lines = (value || '').split('\n');
      const currentPos = start;
      let lineStart = 0;
      let lineIndex = 0;
      
      for (let i = 0; i < lines.length; i++) {
        const lineEnd = lineStart + lines[i].length;
        if (currentPos >= lineStart && currentPos <= lineEnd + 1) {
          lineIndex = i;
          break;
        }
        lineStart = lineEnd + 1;
      }
      
      const lineToCut = lines[lineIndex] + '\n';
      
      // Copy to clipboard
      e.preventDefault();
      e.clipboardData.setData('text/plain', lineToCut);
      
      // Remove the line
      const newLines = [...lines];
      newLines.splice(lineIndex, 1);
      
      // If we removed the last line and there are still lines, we need to handle it differently
      let newValue;
      if (newLines.length === 0) {
        newValue = '';
      } else {
        newValue = newLines.join('\n');
      }
      
      if (onChange) {
        onChange(newValue);
      }
      
      // Update cursor position - keep at same position or move to start of next line
      const newPosition = Math.min(lineStart, newValue.length);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = newPosition;
      }, 0);
      
      // Mark as full line cut
      lastClipboardAction.current = { isFullLine: true };
    } else {
      // Selection exists - mark as partial cut
      lastClipboardAction.current = { isFullLine: false };
    }
    // If there's a selection, default browser behavior handles it
  };

  const handlePaste = (e) => {
    e.preventDefault();
    
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = textarea.value;
    
    // Get pasted text
    const pastedText = e.clipboardData.getData('text/plain');
    
    // Check if this was a full line copy/cut
    const isFullLinePaste = lastClipboardAction.current.isFullLine && pastedText.endsWith('\n');
    
    if (isFullLinePaste) {
      // Full line paste - insert at start of next line
      const lineEnd = currentValue.indexOf('\n', start);
      const insertPos = lineEnd === -1 ? currentValue.length : lineEnd + 1;
      
      const newValue = currentValue.substring(0, insertPos) + pastedText + currentValue.substring(insertPos);
      
      if (onChange) {
        onChange(newValue);
      }
      
      // Move cursor to start of pasted line
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = insertPos;
      }, 0);
      
      // Reset the flag
      lastClipboardAction.current = { isFullLine: false };
      return;
    }
    
    // Smart indentation for pasted code
    if (pastedText.includes('\n')) {
      // Multi-line paste - adjust indentation to match current line
      const lineStart = currentValue.lastIndexOf('\n', start - 1) + 1;
      const currentLine = currentValue.substring(lineStart, start);
      const currentIndent = currentLine.match(/^(\s*)/)?.[1] || '';
      
      // Get the minimum indentation of the pasted text
      const pastedLines = pastedText.split('\n');
      const nonEmptyLines = pastedLines.filter(line => line.trim().length > 0);
      
      if (nonEmptyLines.length > 0) {
        const minIndent = Math.min(...nonEmptyLines.map(line => {
          const match = line.match(/^(\s*)/);
          return match ? match[1].length : 0;
        }));
        
        // Adjust all lines to current indentation
        const adjustedLines = pastedLines.map(line => {
          if (line.trim().length === 0) return '';
          const lineIndent = line.match(/^(\s*)/)?.[1] || '';
          const relativeIndent = lineIndent.length - minIndent;
          const newIndent = currentIndent + ' '.repeat(Math.max(0, relativeIndent));
          return newIndent + line.trimStart();
        });
        
        const adjustedText = adjustedLines.join('\n');
        const newValue = currentValue.substring(0, start) + adjustedText + currentValue.substring(end);
        
        if (onChange) {
          onChange(newValue);
        }
        
        // Update cursor position
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + adjustedText.length;
        }, 0);
      } else {
        // Just paste as-is if all lines are empty
        const newValue = currentValue.substring(0, start) + pastedText + currentValue.substring(end);
        if (onChange) {
          onChange(newValue);
        }
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + pastedText.length;
        }, 0);
      }
    } else {
      // Single-line paste - just insert
      const newValue = currentValue.substring(0, start) + pastedText + currentValue.substring(end);
      if (onChange) {
        onChange(newValue);
      }
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + pastedText.length;
      }, 0);
    }
  };

  // Generate line numbers
  const getLineNumbers = () => {
    const lines = (value || '').split('\n');
    return lines.map((_, index) => index + 1);
  };
  
  const getTotalLines = () => {
    return (value || '').split('\n').length;
  };

  return (
    <div 
      className={`code-editor-container ${className}`} 
      ref={containerRef}
      style={{
        fontSize: `${settings.fontSize}px`,
      }}
    >
      {/* Search Widget */}
      {showSearch && (
        <div className="search-widget">
          <div className="search-row">
            <div className="search-input-wrapper">
              <input 
                type="text" 
                className="search-input" 
                placeholder="Find..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (e.shiftKey) prevMatch(); else nextMatch();
                  } else if (e.key === 'Escape') {
                      setShowSearch(false);
                      textareaRef.current?.focus();
                  }
                }}
              />
              <span className="match-count">
                {searchMatches.length > 0 
                  ? `${currentMatchIndex + 1} of ${searchMatches.length}`
                  : searchQuery ? 'No results' : ''}
              </span>
            </div>
            <div className="search-actions">
              <button className="icon-btn" onClick={prevMatch} title="Previous Match (Shift+Enter)">
                <i className="fas fa-arrow-up"></i>
              </button>
              <button className="icon-btn" onClick={nextMatch} title="Next Match (Enter)">
                <i className="fas fa-arrow-down"></i>
              </button>
              <button className="icon-btn" onClick={() => { setShowSearch(false); textareaRef.current?.focus(); }} title="Close (Esc)">
                <i className="fas fa-times"></i>
              </button>
            </div>
          </div>
          <div className="search-row">
            <div className="search-input-wrapper">
              <input 
                type="text" 
                className="search-input" 
                placeholder="Replace..."
                value={replaceQuery}
                onChange={(e) => setReplaceQuery(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        replace();
                    } else if (e.key === 'Escape') {
                        setShowSearch(false);
                        textareaRef.current?.focus();
                    }
                }}
              />
            </div>
            <div className="search-actions">
              <button className="replace-btn" onClick={replace} disabled={currentMatchIndex === -1}>Replace</button>
              <button className="replace-btn" onClick={replaceAll} disabled={searchMatches.length === 0}>All</button>
            </div>
          </div>
        </div>
      )}

      {/* Go To Line Widget */}
      {showGoToLine && (
        <div className="goto-line-widget">
            <div className="goto-line-header">
                <span>Go to Line</span>
                <button className="icon-btn-small" onClick={() => { setShowGoToLine(false); textareaRef.current?.focus(); }}>
                    <i className="fas fa-times"></i>
                </button>
            </div>
            <div className="goto-line-body">
                <input 
                    type="number" 
                    className="goto-line-input" 
                    placeholder={`1 - ${getTotalLines()}`}
                    min="1"
                    max={getTotalLines()}
                    value={goToLineNumber}
                    onChange={(e) => setGoToLineNumber(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            handleGoToLine();
                        } else if (e.key === 'Escape') {
                            setShowGoToLine(false);
                            textareaRef.current?.focus();
                        }
                    }}
                />
                <button className="btn-goto" onClick={handleGoToLine}>Go</button>
            </div>
        </div>
      )}

      {/* Line numbers */}
      <div 
        className="line-numbers" 
        ref={lineNumbersRef} 
        aria-hidden="true"
        style={{
          fontSize: `${settings.fontSize}px`,
          lineHeight: 1.5,
        }}
      >
        {getLineNumbers().map(lineNumber => (
          <div key={lineNumber} className="line-number">
            {lineNumber}
          </div>
        ))}
      </div>
      
      {/* Code content area */}
      <div className="code-content-area">
        
        {/* Search Highlight Overlay */}
        <div 
          ref={searchLayerRef}
          className="search-highlight-layer"
          dangerouslySetInnerHTML={{ __html: getSearchOverlayHtml() }}
        />

        {/* Syntax highlighted background */}
        <pre 
          ref={highlightRef}
          className="code-highlight-overlay"
          aria-hidden="true"
          style={{
            whiteSpace: settings.wordWrap ? 'pre-wrap' : 'pre',
            wordBreak: settings.wordWrap ? 'break-word' : 'normal',
            overflowWrap: settings.wordWrap ? 'break-word' : 'normal',
            tabSize: settings.tabSize,
          }}
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
          onCopy={handleCopy}
          onCut={handleCut}
          onPaste={handlePaste}
          placeholder={placeholder}
          disabled={disabled}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          style={{
            whiteSpace: settings.wordWrap ? 'pre-wrap' : 'pre',
            wordBreak: settings.wordWrap ? 'break-word' : 'normal',
            overflowWrap: settings.wordWrap ? 'break-word' : 'normal',
            tabSize: settings.tabSize,
          }}
        />
      </div>
    </div>
  );
};

export default CodeEditor;
