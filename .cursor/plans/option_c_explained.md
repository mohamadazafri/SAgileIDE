# Option C Explained: Replacing Local Git with a Hosted Git Service (GitHub / GitLab API)

This document explains Option C — replacing the current local `git` CLI integration with calls to a hosted Git platform (GitHub or GitLab) via their web APIs. No prior knowledge of APIs, GitHub internals, or cloud architecture is assumed.

---

## 1. Recap: What We Do Today

Right now, every time a user creates a project in SAgile IDE, the backend:

1. Creates a folder on the server's local disk: `projects_storage/<project_id>/`
2. Runs `git init` inside that folder (creates a `.git/` directory)
3. Saves all project files there
4. When the user clicks "Commit", runs `git add .` and `git commit` as terminal commands via Python

```python
# How git is used today (repositories/views.py, simplified)
subprocess.run(['git', 'init'], cwd=repo_path)
subprocess.run(['git', 'add', '.'], cwd=repo_path)
subprocess.run(['git', 'commit', '-m', message], cwd=repo_path)
subprocess.run(['git', 'status'], cwd=repo_path)
```

This works perfectly on a single machine with a local disk. The problem is it doesn't scale to multiple servers (pods) in the cloud.

Options A and B kept the `git` CLI approach but changed where the files live. **Option C is fundamentally different**: it throws away the local git CLI entirely and uses GitHub or GitLab as the git backend — the same platforms millions of developers use every day to host their code.

---

## 2. New Terms to Understand

### API (Application Programming Interface)
An API is a way for one program to talk to another over the internet. Instead of a human visiting github.com and clicking buttons, your Python code sends HTTP requests (like web browser requests) to GitHub's servers and GitHub responds with data or confirms that an action was done.

For example, to create a new repository on GitHub via API:
```
POST https://api.github.com/user/repos
Body: { "name": "my-project", "private": true }
```
GitHub creates the repo and responds with its details. No browser needed.

### REST API
The style of API that GitHub and GitLab use. You communicate by sending HTTP requests to URLs (called **endpoints**). Each URL represents a resource (a repo, a file, a commit), and the HTTP method (GET, POST, PUT, DELETE) tells the server what action to take.

### GitHub / GitLab
Both are web platforms for hosting Git repositories. They provide:
- A place to store git repositories in the cloud
- A web UI for browsing code, commit history, pull requests, etc.
- A comprehensive REST API for automating everything the UI can do

**GitHub** is the most popular. **GitLab** can be self-hosted (you run it on your own server), which makes it attractive for private deployments.

### Personal Access Token / OAuth Token
To call the GitHub or GitLab API on behalf of a user, your app needs permission. This is done with a token — a long random string that acts like a password for the API. The token is attached to every API request to prove it is authorised.

There are two main ways to get a token:
- **Personal Access Token (PAT)**: the user generates one manually in their GitHub settings and pastes it into SAgile IDE. Simple, but not a great user experience.
- **OAuth flow**: SAgile IDE redirects the user to GitHub's login page, the user approves access, and GitHub sends a token back to SAgile IDE automatically. This is the "Sign in with GitHub" flow you see on many websites.

### Webhook
A webhook is a way for GitHub/GitLab to notify your app when something happens (e.g., a push, a new commit). Instead of your app constantly asking "has anything changed?", GitHub proactively sends an HTTP POST to a URL you register whenever an event occurs.

---

## 3. How Option C Would Work

### The Core Architecture

```
                     ┌─────────────────────────────┐
                     │     GitHub / GitLab          │
                     │                              │
                     │  user_A/sagile-project-123   │
                     │  user_B/sagile-project-456   │
                     │  (full git repos, hosted)    │
                     └──────────────┬───────────────┘
                                    │
                            REST API calls
                            (HTTPS, no SSH)
                                    │
               ┌────────────────────▼────────────────────┐
               │           Django Backend                 │
               │                                         │
               │  No local project files on disk         │
               │  No subprocess git calls                │
               │  All git operations → API calls         │
               │                                         │
               │  Pod 1, Pod 2, Pod N — all stateless    │
               └─────────────────────────────────────────┘
                        │               │
                        ▼               ▼
                   MongoDB Atlas    Redis
                   (metadata)    (WebSocket + sessions)
```

Every Django pod is now completely **stateless** — it holds no files on its own disk. All "git" operations become API calls to GitHub/GitLab. Every pod can handle every request because none of them own any files.

### What Each Current Git Operation Becomes

| Current (local CLI) | Option C (API call) |
|---|---|
| `git init` | `POST /user/repos` — create a new GitHub repo |
| Write file to disk | `PUT /repos/{owner}/{repo}/contents/{path}` — create/update a file |
| Read file from disk | `GET /repos/{owner}/{repo}/contents/{path}` — fetch file content |
| `git add . && git commit` | `PUT /repos/{owner}/{repo}/contents/{path}` (commits happen per-file, or via a tree/commit object API for bulk) |
| `git status` | `GET /repos/{owner}/{repo}/commits` + compare to known state |
| `git log` | `GET /repos/{owner}/{repo}/commits` |
| `git diff` | `GET /repos/{owner}/{repo}/compare/{base}...{head}` |

### Real-Time Editing

The real-time collaborative editor (Yjs / WebSocket) deals with in-memory state in the browser and on the server. It does not use git directly — it uses `.ystate` files for persistence. Under Option C, there are two sub-choices:

- **Option C1**: Keep a small local disk per pod just for `.ystate` files (CRDT state) and save the canonical file content to GitHub on every debounced save. Heavy on API calls.
- **Option C2**: Keep in-memory CRDT state only and sync to GitHub on explicit user save/commit actions. Simpler but means unsaved edits are lost if the pod crashes.

Neither is as clean as Options A or B for real-time collaboration.

---

## 4. The GitHub API in Practice

Here is what a "create file" API call looks like in Python using the `PyGithub` library:

```python
from github import Github

# Authenticate with the user's token
g = Github(user_github_token)

# Get (or create) the repository
repo = g.get_user().get_repo("sagile-project-123")

# Create or update a file
repo.create_file(
    path="src/index.js",
    message="Initial commit from SAgile IDE",
    content="console.log('hello world');",
    branch="main"
)
```

And reading a file:

```python
file_content = repo.get_contents("src/index.js", ref="main")
decoded = file_content.decoded_content.decode("utf-8")
```

This looks simple for single files. The problem arises when a project has hundreds of files or when you need to commit many files atomically — the API requires multiple round trips, one per file, unless you use the lower-level Git Data API (which is significantly more complex).

---

## 5. The Big Problems with Option C

### Problem 1: API Rate Limits

GitHub enforces strict rate limits:
- Authenticated requests: **5,000 requests per hour per token**
- For a collaborative IDE where files are saved on every keystroke (debounced to every 2 seconds), one active user editing 5 files could burn through 2,500 requests per hour just from auto-saves
- With 10 concurrent users, you hit the limit in minutes

GitLab has similar limits. This is a fundamental mismatch between a real-time IDE's I/O pattern and what a hosting API is designed for.

### Problem 2: Latency per File Operation

Every file read or write is now an **HTTPS round trip to GitHub's servers** (typically 50–200ms). In the current system, reading a file from local disk takes under 1ms. In a real-time editor, this latency is very noticeable.

### Problem 3: Multi-File Commits Are Complex

When a user clicks "Commit" in SAgile IDE, we want to commit all changed files as one atomic git commit. Via the GitHub API, this requires:

1. Get the current commit's tree SHA
2. Upload each changed file as a blob (one API call per file)
3. Create a new tree object referencing all the blobs
4. Create a commit object pointing to the new tree
5. Update the branch reference to point to the new commit

That is 5+ API calls for a commit with 3 changed files. It is doable, but significantly more complex than `git add . && git commit`.

### Problem 4: OAuth Complexity

Each user needs their own GitHub account and must authorise SAgile IDE to act on their behalf. This requires:
- Implementing the OAuth 2.0 authorisation flow (redirect to GitHub, handle callback, store and refresh tokens)
- Managing token expiry and re-authorisation
- Handling users who do not have a GitHub account

This is a substantial amount of authentication infrastructure that does not exist today.

### Problem 5: Dependency on a Third Party

If GitHub has an outage, SAgile IDE is completely broken — users cannot read or write any project files. The current system (and Options A/B) has no such dependency; the files are always on your own infrastructure.

### Problem 6: Cost at Scale

GitHub's free tier limits private repository access. At scale, you would need a GitHub Teams or Enterprise plan, or self-host GitLab — both adding cost and operational complexity.

---

## 6. What This Would Require Changing in Our Codebase

| Area | Current | Option C |
|---|---|---|
| `repositories/views.py` | `subprocess.run(['git', ...])` | Replace with GitHub API calls |
| File read/write | `open(path, 'r/w')` | `repo.get_contents()` / `repo.create_file()` |
| `projects_storage/` directory | Exists, used for all I/O | Deleted entirely |
| `Repository.root_path` field | Local filesystem path | GitHub repo URL/name |
| `.ystate` CRDT files | Stored next to source files on disk | Need new storage strategy |
| User model | No GitHub token field | Add `github_token` field |
| Auth flow | Session login | Session login + GitHub OAuth |
| `EditorConsumer` WebSocket | Saves `.ystate` to disk | Must save to somewhere else (memory? S3?) |

This is a **near-complete rewrite** of the repository and file management system.

---

## 7. Option C vs A vs B

| Aspect | Option A (Shared NFS) | Option B (Per-Pod + S3) | Option C (GitHub API) |
|---|---|---|---|
| Pod statefulness | Stateless (files on NFS) | Stateful (local EBS) | Fully stateless |
| Git operations | Native CLI (fast) | Native CLI (fast) | API calls (slow, rate-limited) |
| File I/O speed | ~1–3ms NFS overhead | Local SSD (fast) | 50–200ms per file (network) |
| Real-time editing | Works well (shared disk) | Works with locking | Problematic (API not designed for it) |
| Code changes needed | Minimal | High | Massive (near-rewrite) |
| Dependency on 3rd party | No | No | Yes (GitHub/GitLab uptime) |
| User needs GitHub account | No | No | Yes |
| Rate limits | None | None | 5,000 req/hr per user |
| Multi-file atomic commit | Simple (one CLI call) | Simple (one CLI call) | Complex (5+ API calls) |
| Operational complexity | Low | High | Very high |
| Good for FYP scope | Yes | No | No |

---

## 8. When Would Option C Actually Make Sense?

Option C is the right architecture for a very different kind of product — one where:

- The primary purpose is to **browse and edit existing GitHub repositories**, not create isolated sandboxed projects (like github.dev, Gitpod, or GitHub Codespaces)
- Users are expected to already have GitHub accounts
- The product is explicitly designed as a GitHub integration, not a standalone IDE
- You want to leverage GitHub's pull request, code review, and collaboration features natively
- You are willing to invest in full OAuth infrastructure and handle rate limiting

SAgile IDE is designed as a **self-contained platform** with its own project management and Agile workflow. Coupling it tightly to GitHub would mean users cannot use it without a GitHub account, and every SAgile-specific git feature (smart commits, blame-to-task traceability) would have to go through the GitHub API rather than being controlled directly.

---

## 9. A Hybrid Future: Option C as an Optional Integration

Option C does not have to be all-or-nothing. A realistic future enhancement would be:

- Keep Option A (NFS) as the primary storage (local `.git/` repos on shared volume)
- Add an **optional GitHub sync** feature: after a commit in SAgile IDE, also push to a connected GitHub repository as a mirror
- Users who want GitHub integration can link their account; those who do not are unaffected

This gives the best of both worlds: the simplicity and speed of local git for the IDE itself, plus the social/visibility benefits of GitHub for teams who want it.

---

## 10. Summary

Option C is the most architecturally elegant solution for stateless scaling, but it comes at an enormous cost: near-total rewrite of the file and git systems, dependency on third-party uptime, rate limit constraints that are fundamentally incompatible with a real-time IDE's access patterns, and a mandatory GitHub account requirement for all users.

For SAgile IDE, Option C is best kept as a **future integration idea** (push-to-GitHub as an optional mirror) rather than a core storage strategy. The real-time collaborative nature of the editor makes it a particularly poor fit for an API-call-per-file architecture.
