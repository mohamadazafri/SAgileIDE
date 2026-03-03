# Phase 1 Collaboration — Test Guide

Covers the two remaining Phase 1 checklist items in `PROJECT_STATUS.md`:

- `[ ] Stability Testing` — disconnect / reconnect handling
- `[ ] Conflict Resolution` — backend state is authoritative on initial load

---

## Quick-start

```bash
# Terminal 1 — backend
# Use daphne directly so that --ping-interval is available.
# Without ping, Chrome DevTools "Offline" mode does not immediately close
# localhost WebSocket connections (Chrome limitation), so the "Reconnecting…"
# badge in T2 would never appear.  With ping-interval 10 / ping-timeout 5,
# Daphne sends a protocol-level WebSocket PING every 10 s; if the browser
# cannot PONG back within 5 s (client offline), Daphne closes the socket and
# the client fires onclose → badge appears within ~15 s.
cd sagile_ide_backend
source venv/bin/activate
cd sagile_ide
daphne -p 8000 --ping-interval 10 --ping-timeout 5 sagile_ide.asgi:application
```

```bash
# Terminal 2 — frontend
cd sagile_ide_frontend
npm start
```

Open **two completely separate browser instances** — NOT two windows or tabs of the same Chrome process.
Chrome DevTools Network throttling applies to Chrome's shared network service, so setting one window
"Offline" would take all Chrome windows offline simultaneously.

**Recommended setup:**
- **Window 1** — your regular Chrome
- **Window 2** — a second Chrome instance with its own isolated network stack:
  ```bash
  google-chrome --user-data-dir=/tmp/chrome-test-profile-2
  ```
  Or simply open Firefox as Window 2 if it is installed.

Log in and open the **same repository → same file** in each instance.

---

## Part 1 — Stability Testing (disconnect / reconnect)

### T1 · Real-time sync baseline ✅ PASSED

> Confirms the collaboration pipeline is working before stress-testing it.

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | In Window 1, type a few characters | Text appears in Window 2 within ~1 s |
| 2 | In Window 2, type a few characters | Text appears in Window 1 within ~1 s |
| 3 | Check backend terminal | `[WS] New session created` once, `[WS] Joined existing session (users: 2)` once |

**Pass:** both editors stay in sync, no page refresh needed.

#### Issues found and resolved during T1

**Issue 1 — WebSocket connections never reached Django**

`y-websocket` was connecting to `ws://localhost:3000/ws/editor/…` (the React dev
server). webpack-dev-server v4 (used by CRA 5) reserves the `/ws` path for its own
Hot Module Replacement socket, so WebSocket upgrade requests on that path were
consumed by the dev server and never proxied to Django. Sync between the two Chrome
windows still _appeared_ to work because `y-websocket` v3 has a built-in
`BroadcastChannel` that syncs tabs/windows sharing the same origin — so the
backend was never involved.

**Fix:** added `REACT_APP_WS_HOST=localhost:8000` to
`.env.development.local` and updated `EditorComponent.jsx` to read it:

```js
const wsHost = process.env.REACT_APP_WS_HOST || window.location.host;
```

In production `REACT_APP_WS_HOST` is unset, so `window.location.host` is used
(correct, because Django serves both frontend and backend on the same host).

**Issue 2 — React StrictMode caused double-mount of the WebSocket effect**

`React.StrictMode` in `index.js` intentionally runs every `useEffect` twice in
development (mount → cleanup → mount again) to surface side-effect bugs. For the
WebSocket setup this produced: connect → disconnect → connect, meaning the backend
would log `[WS] New session created` twice and `[WS] Session ended` once _per
window_ instead of the expected single `New session created` / `Joined existing
session` pair.

**Fix:** removed `<React.StrictMode>` from `src/index.js`. This is safe because
StrictMode's double-invocation is a development-only behaviour; production was
never affected.

---

### T2 · Client-side network drop and reconnect ⏸ DEFERRED

> Simulates a laptop going offline briefly (e.g. flaky Wi-Fi).
>
> ⚠️ **DEFERRED — test environment constraints make this hard to execute reliably on localhost.**
> The code fixes are in place; the test itself needs a suitable environment.  See issues below.
>
> ⚠️ **Requires two separate browser instances** (see Quick-start) so that setting one
> "Offline" does not affect the other.  Chrome DevTools throttling applies to the
> entire Chrome network service — all Chrome windows go offline together.

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Window 1 (main Chrome) → DevTools (`F12`) → Network tab | — |
| 2 | Change "No throttling" dropdown → **Offline** | Within ~15 s, Window 1 editor shows **"Reconnecting…"** badge (red, top-right) |
| 3 | While offline, type `OFFLINE_EDIT` in Window 1 | Yjs accepts the edit locally; Window 2 does **not** see it |
| 4 | Change the dropdown back to **Online** | Badge briefly shows **"Syncing…"** (amber), then disappears |
| 5 | Check Window 2 | `OFFLINE_EDIT` is now visible |

> **Why up to 15 s for the badge?**  Chrome DevTools Offline mode does not immediately
> fire `onclose` for localhost WebSocket connections.  With `--ping-interval 10 --ping-timeout 5`,
> Daphne sends a PING every 10 s and closes the socket 5 s after receiving no PONG — so the badge
> appears within 15 s at most.

**Pass criteria (for when this is re-attempted):** no data lost during the offline period; both windows converge without a reload.

#### Issues found and resolved during T2

**Issue 1 — BroadcastChannel bypasses the network, masking offline state**

`y-websocket` maintains a `BroadcastChannel` bus between same-origin windows
alongside the WebSocket connection.  `BroadcastChannel` is a pure browser API
that never touches the network, so Chrome DevTools "Offline" mode has no effect
on it.  Symptoms observed before the fix:

- Window 2 continued to receive every keystroke from Window 1 while offline.
- The `status` event never fired `'disconnected'`, so the "Reconnecting…" badge
  never appeared.
- The WebSocket *did* drop (backend log: `code: 1006`), but `y-websocket`
  silently fell back to `BroadcastChannel` for inter-window sync.

**Fix:** pass `disableBc: true` to the `WebsocketProvider` constructor in
`EditorComponent.jsx`.  This forces all sync through the WebSocket exclusively,
making the offline/reconnect flow visible and keeping the backend as the sole
source of truth.

**Issue 3 — Chrome DevTools "Offline" throttles ALL Chrome windows, not just one tab**

Chrome's network throttling is applied at the browser's **network service process** level, which is
shared across all windows and tabs in the same Chrome instance.  Setting one window to "Offline"
takes every Chrome window offline simultaneously — making it impossible to test one offline client
against an online one using two Chrome windows alone.

**Fix:** use two completely separate browser instances (see Quick-start).

**Issue 2 — Chrome DevTools "Offline" does not immediately close localhost WebSocket connections**

`y-websocket`'s own source notes: *"I suspect that the `ws.onclose` event is
not always fired if there are network issues."*  In practice, Chrome DevTools
"Offline" throttling does not always send a TCP RST to the loopback interface,
so the WebSocket connection to `localhost:8000` may remain open even when the
browser is logically offline.  The badge is therefore never shown.

`y-websocket` has a 30-second fallback (`messageReconnectTimeout`) that
force-closes the connection if no message is received for 30 s.  However, while
Window 2 is online and typing, the server broadcasts its updates to **all**
connected clients (including the "offline" Window 1).  Window 1 receives those
messages, resetting the 30 s timer — so the timer never expires and the badge
never appears.

**Fix:** run the backend with Daphne's native WebSocket ping instead of
`manage.py runserver`:

```bash
daphne -p 8000 --ping-interval 10 --ping-timeout 5 sagile_ide.asgi:application
```

Daphne sends a protocol-level WebSocket PING frame every 10 s.  The browser
responds automatically with PONG.  When Chrome is "Offline", the PONG cannot
reach the server; after 5 s Daphne closes the socket.  The client fires
`onclose` → `status: 'disconnected'` → **"Reconnecting…" badge appears within
~15 s** of going offline.  The Quick-start command above already uses this.

---

### T3 · Server restart while clients are connected

> Simulates a backend deployment or crash.

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Edit the file in Window 1, wait 3 s | Backend log: `[WS] Saved: /path/to/file` |
| 2 | Stop the backend (`Ctrl+C` in Terminal 1) | Both windows show **"Reconnecting…"** badge |
| 3 | Restart the backend | Backend log: `[WS] Restored CRDT state from disk: <key>` |
| 4 | Both windows reconnect automatically | Badges disappear |
| 5 | Check editor content in both windows | Content matches what was saved in step 1 — **no duplicate lines** |

**Pass:** session survives a full server restart; CRDT document identity is preserved.

> ⚠️ If you see `[WS] Bootstrapped from text` instead of `Restored CRDT state`, the `.ystate`
> file is missing (first run). Make an edit, wait for the save, then restart again — the second
> restart should show `Restored CRDT state`.

---

### T4 · Last-user session eviction and re-entry

> Verifies that the session cleanup path (users → 0) runs correctly.

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Close **both** windows | Backend log: `[WS] Users remaining … 1`, then `… 0`, `[WS] Saved`, `[WS] Session ended` |
| 2 | Open the file in a fresh window | Backend log: `[WS] New session created`, content loads correctly |

**Pass:** clean eviction, no crash, content preserved.

---

### T5 · File-switch re-initialisation

> Verifies that switching tabs in the editor creates a new independent WS session
> (this was broken before — switching files left the editor detached).

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Open **File A** | Backend log: `New session created: project:FileA` |
| 2 | Click **File B** in the file explorer | Backend log: `Disconnected … FileA`, `Connected … FileB`, `New session created: project:FileB` |
| 3 | Type in File B in Window 1 | Window 2 (also on File B) receives the update |
| 4 | Switch back to File A in Window 1 | File A content loads; File B edits are not shown |

**Pass:** each file has its own isolated session; switching files works correctly.

---

## Part 2 — Conflict Resolution (backend as source of truth)

### T6 · Fresh client receives full server state

> Confirms that a new client (empty Y.Doc) gets the backend's content, not a blank editor.

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Window 1: type `AUTHORITATIVE_CONTENT`, wait for `[WS] Saved` | — |
| 2 | Open an **Incognito window** and navigate to the same file | Incognito window shows **"Syncing…"** badge briefly, then displays `AUTHORITATIVE_CONTENT` |
| 3 | No refresh was needed | Badge disappears on its own |

**Pass:** fresh client received the full server state via the sync protocol.

---

### T7 · CRDT binary state persists across server restart (no duplication)

> The most important conflict-resolution test. Without `.ystate` persistence, a server restart
> followed by a reconnect can cause content to appear **twice** (two separate Yjs histories merged).

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Edit the file and wait for `[WS] Saved` | Check that `<file>.ystate` exists next to the source file (see command below) |
| 2 | Stop the backend | — |
| 3 | Restart the backend | Log: `[WS] Restored CRDT state from disk` (not `Bootstrapped from text`) |
| 4 | Open the file | Content appears **exactly once** — no duplicate lines |

Verify the `.ystate` file was created:

```bash
# Replace with your actual project storage path
ls sagile_ide_backend/sagile_ide/projects_storage/<project-id>/src/
# Expected: index.js  index.js.ystate
```

**Pass:** content appears once, log shows `Restored CRDT state`.

---

### T8 · Concurrent connection race condition guard

> Two clients connecting simultaneously to a document that is not yet in memory
> must not each create their own separate doc (which would diverge immediately).

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Close all windows (wait for `[WS] Session ended` in backend log) | — |
| 2 | Open the file URL in **two windows within 1 second** | — |
| 3 | Check the backend log | Exactly **one** `New session created` and **one** `Joined existing session` for the same key |
| 4 | Type in Window 1 | Window 2 receives the update |

**Pass:** only one session is created; no race-duplicated doc.

---

## Backend log reference

| Log line | What it means |
|----------|---------------|
| `[WS] Connected: <channel> → <key>` | New WebSocket accepted |
| `[WS] New session created: <key>` | Doc loaded from disk, session initialised |
| `[WS] Restored CRDT state from disk: <key>` | `.ystate` binary loaded — document identity preserved ✅ |
| `[WS] Bootstrapped from text: <key>` | No `.ystate` yet — first run, or file edited outside IDE |
| `[WS] Joined existing session: <key> (users: N)` | Second+ client joined an in-memory session |
| `[WS] Users remaining for <key>: N` | Client left; N others still active |
| `[WS] Session ended: <key>` | Last client left, session evicted from memory |
| `[WS] Saved: /path/to/file` | Text + `.ystate` written to disk |
| `[WS] Warning: could not save CRDT state: …` | `doc.get_update()` failed — see troubleshooting below |
| `[WS] Disconnected: <channel> → <key> (code: N)` | Client WebSocket closed (1001 = normal, 1006 = network drop) |

---

## Troubleshooting

### No `[WS]` log lines appear even though sync seems to work

This means WebSocket connections are being handled by the React dev server's own
HMR socket path (`/ws`) and never reach Django. Sync between same-browser windows
works silently via `y-websocket`'s BroadcastChannel shortcut, masking the problem.

**Fix:**
1. Ensure `.env.development.local` contains `REACT_APP_WS_HOST=localhost:8000`.
2. Ensure `EditorComponent.jsx` uses `process.env.REACT_APP_WS_HOST || window.location.host`.
3. Restart `npm start` (env vars are only read at startup).

---

### "Reconnecting…" badge never appears when going offline in Chrome DevTools
- Ensure the backend was started with `daphne -p 8000 --ping-interval 10 --ping-timeout 5 …` (see Quick-start).  Without `--ping-interval`, Chrome does not reliably close localhost WebSocket connections and the badge may never appear.
- After switching DevTools to Offline, wait up to ~15 s for the badge.  The badge timing depends on when the last PING was sent (up to 10 s) plus the PONG timeout (5 s).

### "Reconnecting…" badge never goes away
- Check that the backend is running on port 8000.
- Check the browser console for WebSocket errors (`WebSocket connection to … failed`).
- Confirm the Django Channels / Daphne ASGI server is active (not the plain `runserver` HTTP-only mode — the terminal should say `Starting ASGI/Daphne`).

### Content appears twice after server restart
- The `.ystate` file is missing or corrupt. Delete it, restart the server, make an edit (this re-creates `.ystate`), restart again — the second restart should restore cleanly.

### `[WS] CRDT state restore failed ('Doc' object has no attribute 'apply_updates')`
- The pycrdt API uses `apply_update` (singular), not `apply_updates` (plural).  This was fixed in `consumers.py` — if you still see it, confirm the server was restarted after the fix.

### `[WS] Warning: could not save CRDT state`
- The `doc.get_update()` method name differs in this pycrdt build. Run:
  ```bash
  python -c "import pycrdt; d = pycrdt.Doc(); print([m for m in dir(d) if 'update' in m.lower()])"
  ```
  Find the correct method name, update the `save_to_disk_immediate` function in `consumers.py` accordingly, and re-run T7.

### File B shows File A's content after tab switch
- This was the pre-fix behaviour. Confirm `EditorComponent.jsx` has the `useEffect([projectId, filePath, editorMounted])` pattern (not the old `handleEditorDidMount`-only approach). Re-run `npm start` if the frontend was not rebuilt.

---

## Marking the checklist

Once all tests pass, update `PROJECT_STATUS.md`:

```markdown
- [x] **Stability Testing:** Verify handling of disconnects/reconnects.
- [x] **Conflict Resolution:** Ensure backend "truth" overrides properly on initial load.
```

And update the module status table:

```markdown
| **Real-Time Collab** | Multi-user editing, cursor presence, debounced saving to disk. | ✅ **Functional** |
```
