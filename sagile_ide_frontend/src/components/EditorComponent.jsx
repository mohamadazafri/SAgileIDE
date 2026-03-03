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
  className = '',
}) => {
  const { settings } = useSettings();
  const { theme } = useTheme();

  // Refs — hold live objects that must not trigger re-renders on change.
  const editorRef = useRef(null);
  const providerRef = useRef(null);
  const bindingRef = useRef(null);
  const docRef = useRef(null);

  // Tracks whether the Monaco editor has called onMount (editor is ready).
  const [editorMounted, setEditorMounted] = useState(false);

  // Visual status for the collaborative connection.
  const [wsStatus, setWsStatus] = useState('disconnected');
  const [isSynced, setIsSynced] = useState(false);

  // -------------------------------------------------------------------------
  // Yjs session lifecycle — re-runs whenever the file changes or the editor
  // first becomes ready.  This is the key fix: initialising inside onMount
  // meant it only ran once, so switching tabs left the editor detached.
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!editorMounted || !editorRef.current || !projectId || !filePath) return;

    // Tear down any previous session first (happens on file-switch).
    if (bindingRef.current) {
      bindingRef.current.destroy();
      bindingRef.current = null;
    }
    if (providerRef.current) {
      providerRef.current.disconnect();
      providerRef.current.destroy();
      providerRef.current = null;
    }
    if (docRef.current) {
      docRef.current.destroy();
      docRef.current = null;
    }

    setWsStatus('disconnected');
    setIsSynced(false);

    // Fresh Y.Doc for this file — intentionally never cached across sessions.
    // The backend is the single source of truth; on connect it sends sync step 1
    // which causes the client to advertise an empty state vector, so the server
    // replies with the full document state (sync step 2).
    const doc = new Y.Doc();
    docRef.current = doc;

    // In development the React dev server (port 3000) intercepts /ws/* for its
    // own HMR socket before any proxy can forward it to Django.  Setting
    // REACT_APP_WS_HOST in .env.development.local points WebSocket directly at
    // the Daphne backend.  In production the env var is unset and
    // window.location.host is correct because Django serves everything.
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = process.env.REACT_APP_WS_HOST || window.location.host;
    const serverUrl = `${wsProtocol}//${wsHost}/ws/editor`;
    const roomName = `${projectId}/${filePath}`;

    const provider = new WebsocketProvider(serverUrl, roomName, doc, {
      connect: true,
      // Disable the built-in BroadcastChannel shortcut.  Without this flag
      // y-websocket syncs same-origin windows via a browser-internal bus that
      // bypasses the network entirely, so Chrome DevTools "Offline" has no
      // effect and the "Reconnecting…" badge never appears.  The backend must
      // be the only sync path so that offline / reconnect behaviour is testable
      // and so that the backend remains the single source of truth.
      disableBc: true,
      // Periodically re-send sync step 1 while connected so that any updates
      // missed during a brief disconnect are recovered without a full page
      // reload.  5 s is a reasonable balance between latency and overhead.
      resyncInterval: 5000,
    });
    providerRef.current = provider;

    provider.on('status', (event) => {
      setWsStatus(event.status);
      if (event.status !== 'connected') {
        setIsSynced(false);
      }
      console.log(`[YJS] ${event.status}: ${roomName}`);
    });

    // The 'sync' event fires once the initial round-trip with the server is
    // complete.  Until then we show a "Syncing…" overlay so the user knows
    // the editor content is being fetched.
    provider.on('sync', (synced) => {
      setIsSynced(synced);
      if (synced) {
        console.log(`[YJS] Initial sync complete: ${roomName}`);
      }
    });

    // Bind the Yjs shared text to the Monaco model.  MonacoBinding takes
    // ownership of the model value; it sets it to the current Yjs text on
    // creation and keeps them in sync thereafter.
    const type = doc.getText('monaco');
    const binding = new MonacoBinding(
      type,
      editorRef.current.getModel(),
      new Set([editorRef.current]),
      provider.awareness
    );
    bindingRef.current = binding;

    // Cleanup — runs when the effect re-executes (file change) or on unmount.
    return () => {
      if (bindingRef.current) {
        bindingRef.current.destroy();
        bindingRef.current = null;
      }
      if (providerRef.current) {
        providerRef.current.disconnect();
        providerRef.current.destroy();
        providerRef.current = null;
      }
      if (docRef.current) {
        docRef.current.destroy();
        docRef.current = null;
      }
    };
  }, [projectId, filePath, editorMounted]);

  // -------------------------------------------------------------------------
  // Monaco callbacks
  // -------------------------------------------------------------------------

  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;
    // Setting this state triggers the useEffect above to initialise the
    // Yjs session now that editorRef.current is guaranteed to be populated.
    setEditorMounted(true);
  };

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  const getMonacoLanguage = (lang) => {
    const map = {
      js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
      py: 'python', rb: 'ruby', cs: 'csharp', go: 'go', java: 'java',
      html: 'html', css: 'css', json: 'json', md: 'markdown', sql: 'sql',
      cpp: 'cpp', c: 'c',
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

  // -------------------------------------------------------------------------
  // Status badge — visible only when the connection needs attention
  // -------------------------------------------------------------------------

  const renderStatusBadge = () => {
    if (wsStatus === 'connected' && isSynced) return null;

    let label, color;
    if (wsStatus === 'connected') {
      label = 'Syncing\u2026';
      color = 'var(--warning, #FF9800)';
    } else {
      label = 'Reconnecting\u2026';
      color = 'var(--error, #F44336)';
    }

    return (
      <div
        style={{
          position: 'absolute',
          top: '8px',
          right: '16px',
          zIndex: 10,
          fontSize: '11px',
          padding: '2px 8px',
          borderRadius: '4px',
          background: 'rgba(0,0,0,0.55)',
          color,
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        {label}
      </div>
    );
  };

  return (
    <div
      className={`monaco-wrapper ${className}`}
      style={{ height: '100%', width: '100%', overflow: 'hidden', position: 'relative' }}
    >
      {renderStatusBadge()}
      <Editor
        height="100%"
        width="100%"
        language={getMonacoLanguage(language)}
        theme={theme === 'dark' ? 'vs-dark' : 'light'}
        options={options}
        onMount={handleEditorDidMount}
        loading={<div style={{ padding: '20px' }}>Loading Editor…</div>}
      />
    </div>
  );
};

export default EditorComponent;
