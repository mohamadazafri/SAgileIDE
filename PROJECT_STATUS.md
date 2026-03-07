# SAgile IDE - Project Status & Roadmap

## 1. Project Overview
**SAgile IDE** is a web-based Integrated Development Environment designed to bridge the gap between software development and Agile project management. Unlike standard IDEs, SAgile IDE integrates Scrum/Agile workflows directly into the coding environment, allowing developers to link code changes to user stories, track sprint progress, and collaborate in real-time without context switching.

## 2. Technical Architecture

### Backend (`sagile_ide_backend`)
*   **Framework:** Django 5 (Python 3.13)
*   **Database:** MongoDB (via `mongoengine` & `pymongo`)
    *   *Rationale:* Flexible schema for code files, complex project metadata, and rapid iteration.
*   **Real-Time Layer:** Django Channels (ASGI) + Daphne
    *   **Protocol:** WebSockets (`ws://`)
    *   **Sync Engine:** `pycrdt` (Python bindings for Yjs CRDTs) for conflict-free real-time text synchronization.
*   **Version Control:** Native Git integration via Python `subprocess` interacting with the local file system.

### Frontend (`sagile_ide_frontend`)
*   **Framework:** React 18
*   **Code Editor:** Monaco Editor (VS Code core)
*   **Real-Time Client:** `yjs`, `y-websocket`, `y-monaco`
    *   Handles peer-to-peer like synchronization with the backend acting as the central authority and persistence layer.
*   **Styling:** CSS Modules / Global CSS (Dark/Light theme support).

## 3. Core Modules & Current Status

| Module | Description | Status |
| :--- | :--- | :--- |
| **Authentication** | User registration, login, logout, role-based access (Scrum Master, Developer, etc.). | ✅ **Functional** |
| **Project Management** | Create, view, and manage SAgile projects. Team membership handling. | ✅ **Functional** |
| **Repository System** | Mapping projects to file system storage. Metadata tracking in MongoDB. | ✅ **Functional** |
| **Code Editor** | Monaco-based editor with syntax highlighting. | ✅ **Functional** |
| **Real-Time Collab** | Multi-user editing, cursor presence, debounced saving to disk. | ✅ **Functional** |
| **Git Integration** | `git status`, `git add`, `git commit` via UI panels. | 🟡 **In Progress / Refinement** |
| **File Explorer** | Tree view of files. File creation/deletion/renaming. | 🟡 **Partially Implemented** |
| **Task Board** | Scrum board (ToDo, In Progress, Done) linked to code. | ⚪ **Pending Integration** |

## 4. Development Checklist & Roadmap

This checklist ensures all team members (and AI agents) are aligned on the immediate and long-term goals.

### ✅ Phase 1: Core Collaboration (Complete)
- [x] **WebSocket Setup:** Configure Django Channels and routing.
- [x] **CRDT Integration:** Implement `pycrdt` on backend and `yjs` on frontend.
- [x] **Persistence:** Save in-memory CRDT models to disk (debounced).
- [x] **Stability Testing:** Verify handling of disconnects/reconnects.
- [x] **Conflict Resolution:** Ensure backend "truth" overrides properly on initial load.

### 🟠 Phase 2: File System & Git
- [x] **Git Backend:** Views for `status` and `commit`.
- [x] **Git Frontend:** UI Panel to view changes and commit.
- [ ] **File Operations:**
    - [ ] Create new file/folder.
    - [ ] Delete file/folder.
    - [ ] Rename file/folder.
    - [ ] Move files (Drag & Drop).
- [ ] **Selective Staging:** Update backend to allow staging specific files (currently `git add .`).

### 🟡 Phase 3: Agile Integration
- [ ] **Task ID System:** Each task gets a unique project-scoped ID (e.g., `SAG-101`). Stored as a field on the Task model in MongoDB.
- [ ] **Commit-to-Task Linking:** Add a "Link to Task" dropdown in the commit UI that auto-prefixes the commit message (e.g., `SAG-101: implemented real-time socket connection`). Backend parses and stores the association.
- [ ] **Smart Commits:** Parse commit messages post-commit for keywords (`#done`) to trigger automatic task status transitions via internal API. Start with one keyword only.
- [ ] **Branching Convention (Design):** Enforce/suggest branch naming format `feature/SAG-101-short-description` and `fix/SAG-101-short-description`. Full branch management UI is out of scope — document as a design decision.
- [ ] **Blame-to-Task (Future):** Use `git blame` to trace a line of code → commit → Task ID → original business context. Highest academic value; document as a design contribution even if UI is not fully built.
- [ ] **Smart Context:** Opening a task opens relevant files automatically.
- [ ] **Sprint View:** Visualize sprint progress based on code activity.

### 🟢 Phase 4: Polish & Experience
- [ ] **Terminal:** Web-based terminal (xterm.js) for running arbitrary commands.
- [ ] **Linter/Intellisense:** Language Server Protocol (LSP) connection (Basic support via Monaco).
- [ ] **Repository Templates:** Enhanced UI for selecting/previewing templates during creation.

### 🔵 Phase 5: Scalability & Infrastructure
- [ ] **Redis Channel Layer:** Replace `InMemoryChannelLayer` with `channels_redis` to support multiple Daphne workers/processes. Currently, the in-memory layer isolates each process's group memberships, meaning users on different workers cannot receive each other's real-time edits. Switching to Redis as a shared message broker resolves this and enables horizontal scaling.
    - Install `channels_redis` and run a Redis instance.
    - Update `CHANNEL_LAYERS` in `settings.py` to use `RedisChannelLayer` pointing to the Redis server URL.

## 5. Git-Agile Workflow Design (To Be Implemented in Phase 3)

This section captures the agreed-upon design for how git and Agile tasks will be linked. Serves as a reference for implementation and for the FYP report.

### Task Naming
- Every task has a unique, project-scoped ID: `SAG-101`, `SAG-102`, etc.
- The prefix `SAG` is fixed; the number increments per project.

### Commit Message Convention
- All commits linked to a task are prefixed with the ID: `SAG-101: implemented real-time socket connection`.
- The commit UI will have a "Link to Task" dropdown that auto-inserts this prefix.
- The backend stores the commit hash ↔ Task ID association in MongoDB for querying.

### Smart Commits (Keyword Triggers)
- Commit messages can contain keywords to trigger task state transitions automatically.
- Planned keyword: `#done` → moves the linked task to "Done" on the board.
- Parsing happens server-side after the commit is recorded. Invalid/unknown keywords are silently ignored.

### Branching Strategy (Design Convention — Not Full UI)
- Suggested branch naming: `feature/SAG-101-short-description`, `fix/SAG-101-short-description`.
- Full branch create/switch/merge UI is **out of scope** for the FYP build.
- This convention will be documented as a design decision in the report.

### Blame-to-Task Traceability (Research Contribution)
- The long-term vision: `git blame` on a file line → commit hash → Task ID → original user story and business context.
- This creates **bidirectional traceability** between code and requirements — the core academic argument of SAgile.
- Full UI implementation is deferred. This will be discussed as a design contribution in the FYP report regardless of implementation status.

---

## 6. Directory Structure Reference

```
/
├── sagile_ide_backend/
│   ├── sagile_ide/
│   │   ├── asgi.py          # WebSocket entry point
│   │   ├── settings.py      # Config (Mongo, Channels)
│   │   ├── urls.py          # Main routing
│   │   └── ...
│   ├── projects/            # Project logic & Consumers (WebSocket)
│   ├── repositories/        # Repo & File management views
│   ├── users/               # Auth & User models
│   └── manage.py
├── sagile_ide_frontend/
│   ├── src/
│   │   ├── components/      # React Components (Editor, GitPanel, etc.)
│   │   ├── services/        # API Utils (api.js)
│   │   └── styles/          # CSS files
│   └── package.json
├── projects_storage/        # Local storage for repository files (Git roots)
└── README.md
```

## 6. How to Run

1.  **Backend:**
    ```bash
    cd sagile_ide_backend
    source env/bin/activate  # If using virtualenv
    python manage.py runserver
    ```
    *Runs on `localhost:8000` (HTTP & WebSocket)*

2.  **Frontend:**
    ```bash
    cd sagile_ide_frontend
    npm start
    ```
    *Runs on `localhost:3000`*
