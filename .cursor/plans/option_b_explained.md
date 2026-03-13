# Option B Explained: Per-Pod Volume with Object Storage Sync

This document explains Option B — where each app instance keeps its own fast local disk, and project files are pushed to cloud object storage at key points (like on a git commit). No prior knowledge of cloud infrastructure is assumed.

---

## 1. Quick Recap: Why We Need Options at All

In the [Option A explanation](option_a_explained.md) we covered why local disk storage breaks when you run multiple copies of your app in the cloud. The short version: if each copy has its own private disk, they cannot see each other's files.

Option A solved this by giving all copies access to **one shared network disk** (EFS/NFS).

Option B takes a different approach: each copy keeps its **own fast local disk**, but periodically mirrors its files to a central cloud storage bucket (like Amazon S3). Think of it as everyone working in their own notebook, but photocopying important pages into a shared filing cabinet at regular intervals.

---

## 2. New Terms to Understand

### Object Storage (S3, GCS, Azure Blob)
Object storage is a type of cloud storage that is optimised for storing large amounts of files cheaply and durably. Unlike a filesystem (where you navigate folders and files), object storage works more like a key-value store:

- You store a file (called an "object") under a unique name called a **key** (e.g., `user_A/project_123/index.js`)
- You retrieve it by that key
- You cannot run programs directly from it — it is not a real filesystem
- It is extremely cheap, infinitely scalable, and globally available

Common services:
- **Amazon S3** (Simple Storage Service) — the most widely used
- **Google Cloud Storage (GCS)**
- **Azure Blob Storage**

Think of it as a giant, globally accessible hard drive with no folder structure — just a flat list of uniquely named files.

### EBS (Elastic Block Storage — AWS)
EBS is Amazon's version of a normal hard drive, but in the cloud. It is a block storage device that you attach to a single virtual machine (or container). It behaves exactly like a local SSD: fast reads/writes, full POSIX filesystem support, git works perfectly on it.

The catch: **one EBS volume can only be attached to one machine at a time** (by default). So two pods cannot share the same EBS volume simultaneously. This is what makes Option B different from Option A — instead of sharing, each pod gets its own private EBS.

### Sync / Reconciliation
"Syncing" means copying files from one location to another to make them match. In Option B, syncing happens in one direction: from the pod's local EBS disk to the S3 bucket. When a new pod starts up, it downloads the latest files from S3 onto its own fresh EBS disk. When the pod saves changes, it uploads the changed files back to S3.

### Warm-Up / Pod Initialisation
When a new pod starts, it does not yet have the project files on its local disk. It must first download them from S3. This process is called "warming up" the pod. Until the download is complete, the pod cannot serve requests for those files.

---

## 3. How Option B Works

### The Core Pattern

```
                 ┌──────────────────────────────────────┐
                 │           Amazon S3 Bucket            │
                 │   (central, durable, always there)    │
                 │                                       │
                 │   user_A/project_123/index.js         │
                 │   user_A/project_123/style.css        │
                 │   user_A/project_123/.git/HEAD        │
                 │   user_A/project_123/.git/objects/... │
                 └──────────┬───────────────┬────────────┘
                            │               │
                   download on          upload on
                   pod startup          git commit
                            │               │
                ┌───────────▼──┐    ┌───────▼──────────┐
                │    Pod 1     │    │      Pod 2        │
                │  Django app  │    │   Django app      │
                │              │    │                   │
                │  /local/     │    │  /local/          │
                │  projects/   │    │  projects/        │
                │  (EBS disk)  │    │  (EBS disk)       │
                │  ← fast I/O  │    │  ← fast I/O       │
                └──────────────┘    └───────────────────┘
```

1. When a pod starts, it downloads the project files it needs from S3 onto its own local disk
2. All file reads and writes happen on the local disk — this is very fast (no network overhead per operation)
3. When the user triggers a `git commit`, the backend uploads the updated project files back to S3
4. Other pods either periodically poll S3 for changes, or are told via a message (e.g., through Redis) to re-download the updated files

### The Workflow in Steps

```
User opens project in browser
        │
        ▼
Pod receives request
        │
        ▼
Does this pod have the project files locally?
   ├── YES → serve immediately
   └── NO  → download from S3 first (warm-up)
             then serve
        │
        ▼
User edits code (WebSocket, real-time)
All writes go to pod's local disk (fast)
        │
        ▼
User clicks "Commit"
        │
        ▼
Backend runs:  git add . && git commit
Then:          upload changed files to S3
        │
        ▼
Other pods receive notification via Redis:
"project_123 has new changes — invalidate your local copy"
```

---

## 4. Why Each Pod Needs Its Own Disk

Object storage (S3) cannot be used as a filesystem directly. You cannot do:

```python
subprocess.run(['git', 'init'], cwd='s3://my-bucket/project_123')  # ← This does NOT work
```

Git needs a real filesystem. So each pod needs a real local disk (EBS) for git to work. S3 is only used for **backup and sharing** between pods, not as the live working directory.

This is the fundamental difference from Option A:

| | Option A | Option B |
|---|---|---|
| Working directory | Shared NFS volume (EFS) | Pod's own local EBS |
| Who owns the files during use | All pods simultaneously | One pod at a time (the "owner pod") |
| Files in S3 | Not used | Backup/sync target |
| File access speed | NFS speed (~1–3ms overhead) | Local SSD speed (near zero overhead) |

---

## 5. The Stickiness Problem

Option B introduces a concept called **session stickiness** (also called sticky sessions). Because each pod has its own local copy of files, it is best if the same user always connects to the same pod throughout a session. Otherwise:

- User connects to Pod 1, starts editing `index.js`
- Pod 1 writes changes to its local disk but has not uploaded to S3 yet (debounced)
- User's next request is routed to Pod 2 (load balancer round-robin)
- Pod 2 does not have the latest `index.js` — it would serve a stale version

To avoid this, the load balancer must use **sticky sessions**: once a user is routed to Pod 1, all their requests go to Pod 1 until the session ends. This is a standard feature in most load balancers (e.g., AWS ALB's "stickiness" setting), but it reduces the effectiveness of load balancing — if Pod 1 has 100 sticky users, Pod 2 might be sitting idle.

---

## 6. The Warm-Up Problem

When Kubernetes scales up (adds a new pod because traffic increased), the new pod starts with an empty local disk. If a user is routed to this new pod and their project data has not been downloaded from S3 yet, the request fails or stalls.

Solutions:
- **Eager loading**: when a pod starts, immediately download all projects (slow startup, wastes space if most projects are never accessed)
- **Lazy loading**: download a project only when first requested on that pod (first request is slow, subsequent ones are fast)
- **Pre-warming**: before sending traffic to a new pod, trigger a health check that also downloads commonly accessed projects

None of these are needed in Option A, where all files are always available on the shared volume instantly.

---

## 7. The Sync Conflict Problem

With Option B, two pods could theoretically have the same project checked out locally at the same time. If both modify the same file and then both try to upload to S3, one upload will overwrite the other — **silent data loss**.

This is known as a **write conflict** or **split-brain** scenario.

```
Pod 1: user A edits index.js → saves locally
Pod 2: user B edits index.js → saves locally (different version)

Pod 1 uploads to S3 → S3 has version A
Pod 2 uploads to S3 → S3 has version B (overwrites version A)

Version A is LOST.
```

In Option A this cannot happen because all pods write to the same NFS directory — there is only one "truth". In Option B, you must implement additional logic to prevent this:

- **Project locking**: only one pod is allowed to have a project checked out at a time. A Redis lock tracks which pod "owns" a project. If another pod needs it, the current owner flushes to S3 first.
- **Versioning**: S3 supports object versioning (every upload keeps a history). You can detect conflicts by comparing version IDs before uploading.
- **Yjs CRDT merging**: for real-time text, Yjs already handles conflicts. But git history and binary files are not covered by Yjs — they need the locking approach.

---

## 8. What Changes in Our Code

Option B requires **significant new code** compared to Option A. Here is a summary:

### New components needed

| Component | Purpose |
|---|---|
| S3 sync service | Upload/download project files to/from S3 on demand |
| Project lock manager | Redis-based lock: "Pod X owns project Y" |
| Pod startup hook | On pod init, check Redis for any projects assigned to this pod and download from S3 |
| Commit hook | After every `git commit`, trigger upload to S3 |
| Cache invalidation | Notify other pods via Redis when S3 is updated |
| Stale file eviction | Remove locally cached projects that haven't been used recently to free disk space |

### Example: uploading to S3 after a commit

```python
import boto3

s3 = boto3.client('s3')

def upload_project_to_s3(project_id, local_path, bucket_name):
    for root, dirs, files in os.walk(local_path):
        # Skip .ystate files — they are transient CRDT state
        dirs[:] = [d for d in dirs if d != '.git']  # optionally skip .git for size
        for file in files:
            full_path = os.path.join(root, file)
            relative_key = os.path.relpath(full_path, local_path)
            s3_key = f"{project_id}/{relative_key}"
            s3.upload_file(full_path, bucket_name, s3_key)
```

This is called after every `git commit` view in `repositories/views.py`. Downloading on pod startup is the reverse — listing all objects under the project's key prefix and writing them to the local disk.

### Example: acquiring a project lock before serving

```python
import redis

r = redis.Redis(host='redis-host', port=6379)

def acquire_project_lock(project_id, pod_id, ttl=3600):
    """
    Returns True if this pod now owns the project.
    Returns False if another pod already owns it.
    """
    lock_key = f"project_lock:{project_id}"
    return r.set(lock_key, pod_id, nx=True, ex=ttl)
```

None of this code exists today. It would need to be built from scratch.

---

## 9. Comparison: Option A vs Option B

| Question | Option A (Shared NFS) | Option B (Per-Pod + S3) |
|---|---|---|
| File access speed | Slightly slower (network) | Fast (local disk) |
| Code changes needed | Minimal (just a path setting) | Significant (S3 sync, locks, cache) |
| Handles concurrent edits safely | Yes (one filesystem) | Only with locking logic |
| Pod startup time | Instant | Slow (must download from S3) |
| Sticky sessions required? | No | Yes |
| Data loss risk | Low | Medium (if sync logic has bugs) |
| Cost | Higher (NFS is pricier than S3) | Lower storage cost but more compute |
| Operational complexity | Low | High |
| Good for this project (FYP)? | Yes | No — too much extra engineering |

---

## 10. When Would You Actually Choose Option B?

Option B starts to make sense in very large-scale production systems where:

- You have **hundreds or thousands of pods** and the performance overhead of NFS becomes measurable
- Projects are so large (gigabytes of files) that NFS throughput becomes a bottleneck
- You want **geo-distributed deployments** (e.g., servers in Asia and Europe) where a single NFS volume in one region would be too slow for the other region
- You need **fine-grained cost optimisation** and are willing to invest engineering time

For an application like SAgile IDE at FYP scale (tens to hundreds of concurrent users), the NFS overhead of Option A is imperceptible and the engineering cost of Option B is not justified.

---

## 11. Summary

Option B is the approach used by some large-scale production systems (e.g., how some CI/CD systems cache build artifacts). It offers faster local I/O at the cost of significant added complexity: you must build a sync engine, a distributed locking system, a pod warm-up mechanism, and handle sticky sessions. None of these exist in the current codebase.

For SAgile IDE, Option B is documented here for completeness and as a future reference if the system ever needs to scale beyond what Option A can handle. For now, Option A is the right choice.
