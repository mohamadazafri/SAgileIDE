# Option A Explained: Persistent Shared Volume for Beginners

This document explains Option A — using a **persistent shared network volume** — from the ground up. No prior knowledge of cloud infrastructure is assumed.

---

## 1. The Problem We Are Solving

Right now, when a user creates a project on SAgile IDE, the project files get saved to a folder on the **same computer (server) that runs the Django app**:

```
/home/server/sagile_ide_backend/sagile_ide/projects_storage/
└── abc123project/
    ├── index.js
    ├── style.css
    └── .git/
```

This works fine when there is only one server and one or two developers testing it. But imagine the app is deployed in the cloud and hundreds of users are using it at the same time. The cloud platform will need to run **multiple copies** of our Django app to share the load. Each copy runs inside something called a **container** (or **pod**).

Here is the problem: if each copy of the app has its own private disk, they do not share files.

```
User A → lands on Copy 1 → saves file to Copy 1's disk
User B → lands on Copy 2 → can't see User A's file (it's on Copy 1's disk)
```

This is broken. We need all copies of the app to look at the **same storage**.

---

## 2. Key Terms Explained Simply

### Container
A container is like a lightweight, portable box that packages your app and everything it needs to run (Python, Django, libraries, etc.). You can run many identical boxes at the same time. Each box is isolated — it has its own temporary disk. When the box is deleted or restarted, everything on that temporary disk is **gone**.

Think of it like a hotel room: the room has furniture (the app), but if the guest leaves and the room is cleaned, anything left on the desk is thrown away.

### Pod
A pod is the Kubernetes word for "one running container" (or a small group of tightly related containers). When Kubernetes runs your Django app, it creates one or more pods. Each pod is an isolated box.

### Kubernetes
Kubernetes is a tool that manages many containers for you. It decides which server (machine) to run each container on, restarts containers if they crash, scales up the number of containers when traffic increases, and scales them down when traffic drops. You do not manage individual servers — you tell Kubernetes what you want ("run 3 copies of this app") and it handles the rest.

Think of Kubernetes as a restaurant manager who decides which waiter serves which table, and calls in extra waiters during rush hour.

### NFS (Network File System)
NFS is a protocol (a communication standard) that allows a computer to access a folder stored on another computer **over the network**, as if that folder were a local folder on its own disk. It has been around since the 1980s and is very mature and reliable.

The computer providing the folder is called the **NFS server**. The computers accessing it are called **NFS clients**. From the client's point of view, the folder looks and behaves like any other local folder.

### EFS (Elastic File System — AWS)
AWS EFS (Amazon Web Services Elastic File System) is Amazon's managed NFS service. You do not have to set up or maintain an NFS server yourself — AWS does it for you. You just create an EFS filesystem in the AWS console, and AWS gives you a network address to connect to. It automatically scales as you store more files, and it is replicated across multiple data centres so your data is safe even if one data centre has a problem.

Equivalent services on other cloud platforms:
- **GCP Filestore** (Google Cloud Platform)
- **Azure Files** (Microsoft Azure)

### Persistent Volume (PV) and Persistent Volume Claim (PVC)
In Kubernetes, a **Persistent Volume** is a piece of storage that outlives any individual pod. Even if the pod is deleted, the data on the persistent volume remains.

A **Persistent Volume Claim** is a pod's request for storage. It says "I need X gigabytes of storage with these properties." Kubernetes then finds (or creates) a matching Persistent Volume and connects them.

Think of it as:
- Persistent Volume = a physical hard drive
- Persistent Volume Claim = a reservation form a pod fills out to be assigned that drive

### Mount / Mount Point
When a folder from a remote server (like EFS) is made accessible inside a container at a specific path, that is called **mounting**. The path where it appears is called the **mount point**.

Example: EFS stores files on Amazon's servers somewhere in the cloud. We tell Kubernetes: "make those files appear at `/mnt/projects_storage` inside every pod." From Django's point of view, `/mnt/projects_storage` is just a normal folder. It has no idea the files are actually stored on Amazon's servers.

---

## 3. How Option A Solves the Problem

With Option A, instead of each pod using its own temporary local disk, **all pods mount the same EFS folder at the same path**:

```
                    ┌─────────────────────────────────┐
                    │          AWS EFS (the real       │
                    │          storage on Amazon)       │
                    │                                  │
                    │  /projects_storage/              │
                    │  └── user_A/                     │
                    │      └── project_123/            │
                    │          ├── index.js            │
                    │          ├── style.css           │
                    │          └── .git/               │
                    └──────────────┬──────────────────┘
                                   │  NFS network connection
                  ┌────────────────┼────────────────┐
                  ▼                ▼                 ▼
           ┌──────────┐    ┌──────────┐    ┌──────────┐
           │  Pod 1   │    │  Pod 2   │    │  Pod 3   │
           │  Django  │    │  Django  │    │  Django  │
           │          │    │          │    │          │
           │ /mnt/    │    │ /mnt/    │    │ /mnt/    │
           │ projects_│    │ projects_│    │ projects_│
           │ storage/ │    │ storage/ │    │ storage/ │
           │ (same FS)│    │ (same FS)│    │ (same FS)│
           └──────────┘    └──────────┘    └──────────┘
```

Now it does not matter which pod a user's request lands on. All pods see the same files. When Pod 1 creates `project_123/index.js`, Pods 2 and 3 can immediately see and read that file.

---

## 4. What Changes in Our Code

Almost nothing. The Django code currently does things like:

```python
# repositories/views.py
base_storage = settings.BASE_DIR / 'projects_storage'
repo_path = base_storage / str(project_id)
os.makedirs(repo_path, exist_ok=True)
```

With Option A, we only need to change **where that path points**. Instead of pointing to a folder on the container's own disk, it points to the mounted EFS folder. We do this by:

1. Adding a `PROJECTS_STORAGE_PATH` setting to `settings.py`:

```python
# settings.py
import os
PROJECTS_STORAGE_PATH = os.environ.get('PROJECTS_STORAGE_PATH', BASE_DIR / 'projects_storage')
```

2. In the cloud, we set the environment variable:

```
PROJECTS_STORAGE_PATH = /mnt/projects_storage
```

3. That `/mnt/projects_storage` path is the EFS mount point, declared in Kubernetes config.

That is the entire change from the Django code's perspective. All `os.makedirs`, `open()`, and `git` subprocess calls continue to work exactly the same.

---

## 5. Why Git Still Works

Our backend runs git commands like this:

```python
subprocess.run(['git', 'init'], cwd='/mnt/projects_storage/user_A/project_123')
subprocess.run(['git', 'commit', '-m', 'save'], cwd='/mnt/projects_storage/user_A/project_123')
```

Git needs a real POSIX filesystem (the standard filesystem behaviour that Linux expects: files, directories, permissions, etc.). EFS and other managed NFS services fully support POSIX, so git runs exactly the same as it would on a local disk. Git does not know or care that the folder is actually on Amazon's servers.

---

## 6. Why the Real-Time Collaborative Editor Still Works

Our editor uses **Yjs** for real-time collaboration. Every file has a companion `.ystate` file next to it (e.g., `index.js.ystate`) that stores the collaborative editing state. The Django Channels WebSocket consumer reads and writes this file on every keystroke.

With EFS, the `.ystate` file is shared across all pods. However, there is one more piece needed: when two users are editing the same file, they might be connected to **different pods**. Pod 1 receives User A's keystrokes, and Pod 2 receives User B's keystrokes. For them to see each other's changes in real time, the pods must communicate.

This is why **Redis** is also needed alongside EFS:

```
User A ──WebSocket──► Pod 1 ──► Redis ──► Pod 2 ──WebSocket──► User B
                         │                    │
                         └────────► EFS ◄─────┘
                              (persists .ystate)
```

- **EFS** handles persistence (the file is saved to disk)
- **Redis** handles real-time message passing between pods (the live update stream)

---

## 7. Step by Step: What Happens When a User Saves a File

1. User types in the browser → browser sends a WebSocket message to the server
2. Load balancer routes the WebSocket to, say, Pod 2
3. Pod 2's `EditorConsumer` receives the Yjs update
4. Pod 2 writes the updated content to `/mnt/projects_storage/user_A/project_123/index.js` (on EFS)
5. Pod 2 writes the updated CRDT state to `/mnt/projects_storage/user_A/project_123/index.js.ystate` (on EFS)
6. Pod 2 publishes the Yjs update message to the Redis channel for that file
7. Pod 1 (where another collaborator is connected) receives the message from Redis
8. Pod 1 sends the update over its WebSocket to the other user's browser
9. The other user's editor updates in real time

---

## 8. What Happens if a Pod Crashes

One of the big benefits of this approach is **resilience**:

- The pod crashes → Kubernetes automatically starts a new pod
- The new pod mounts the same EFS volume → all project files are still there
- MongoDB still has all the project metadata (members, repository records, etc.)
- Users reconnect → they are routed to a healthy pod → everything continues

No data is lost because the files live on EFS, not on the pod's temporary disk.

---

## 9. Setting This Up on AWS (Step by Step, Plain English)

### Step 1: Create an EFS Filesystem
- Log into the AWS Management Console
- Go to **EFS** (search for it in the top bar)
- Click **Create file system**
- Choose the same **VPC** (Virtual Private Cloud — the private network) that your app servers are in
- AWS will create mount targets in each availability zone (data centre) automatically
- Note the **File system ID** (e.g., `fs-0abc1234`)

### Step 2: Install the EFS CSI Driver (for Kubernetes / EKS)
AWS provides a driver that lets Kubernetes talk to EFS. If you are using AWS EKS (their managed Kubernetes service), you install this driver once:

```bash
kubectl apply -k "github.com/kubernetes-sigs/aws-efs-csi-driver/deploy/kubernetes/overlays/stable/?ref=release-1.7"
```

### Step 3: Create a StorageClass and PersistentVolumeClaim
You write two small YAML config files that tell Kubernetes "here is my EFS disk, and I want a 10GB portion of it":

```yaml
# storageclass.yaml — tells Kubernetes how to provision EFS volumes
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: efs-sc
provisioner: efs.csi.aws.com

---
# pvc.yaml — reserves the storage for our app
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: sagile-projects-pvc
spec:
  accessModes:
    - ReadWriteMany        # multiple pods can read AND write simultaneously
  storageClassName: efs-sc
  resources:
    requests:
      storage: 10Gi
```

`ReadWriteMany` is the key — it means multiple pods can all read and write at the same time, which is exactly what we need.

### Step 4: Attach the Volume to Your Django Deployment
In your Kubernetes deployment config, you reference the PVC and tell Kubernetes where to mount it inside the container:

```yaml
# deployment.yaml (simplified)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sagile-backend
spec:
  replicas: 3             # run 3 copies of the Django app
  template:
    spec:
      volumes:
        - name: projects-storage
          persistentVolumeClaim:
            claimName: sagile-projects-pvc   # the PVC we created above

      containers:
        - name: django
          image: your-dockerhub/sagile-ide-backend:latest
          env:
            - name: PROJECTS_STORAGE_PATH
              value: /mnt/projects_storage   # Django reads this env var
          volumeMounts:
            - name: projects-storage
              mountPath: /mnt/projects_storage   # EFS appears here inside the container
```

### Step 5: Update `settings.py`
```python
import os
PROJECTS_STORAGE_PATH = os.environ.get('PROJECTS_STORAGE_PATH', BASE_DIR / 'projects_storage')
```

### Step 6: Migrate Existing Data (one-time)
If you already have data in the local `projects_storage/` folder, copy it to EFS using `rsync` or the AWS CLI before switching over.

### Step 7: Deploy and Test
Apply your Kubernetes configs, and the pods will start up with EFS mounted. Create a project in the app and verify the files appear on the EFS filesystem.

---

## 10. Summary

| Question | Answer |
|---|---|
| What is EFS? | Amazon's managed network hard drive, accessible from many servers at once |
| What is NFS? | The protocol EFS uses to share files over a network |
| What is a pod? | One running copy of our Django app inside a container |
| What is Kubernetes? | The tool that manages and scales our pods automatically |
| What is a mount point? | The folder path inside a pod where the EFS disk appears |
| Does our Django code change much? | No — only the path setting changes |
| Does git still work? | Yes — EFS behaves like a normal Linux filesystem |
| What about real-time editing? | EFS handles file persistence; Redis handles live message passing between pods |
| What if a pod crashes? | A new pod starts automatically and mounts the same EFS — no data loss |
