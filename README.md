# SAgile IDE

**SAgile IDE** is a modern, web-based integrated development environment (IDE) designed to provide a complete code editing experience with repository management, real-time collaboration, and professional editor features. Built with Django and React, SAgile IDE offers a seamless development workflow directly in your browser.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Django](https://img.shields.io/badge/Django-4.2.23-green.svg)
![React](https://img.shields.io/badge/React-19.1.1-blue.svg)
![MongoDB](https://img.shields.io/badge/MongoDB-Latest-green.svg)

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Architecture](#project-architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Usage Guide](#usage-guide)
- [Contributing](#contributing)
- [License](#license)

---

## Features

### Dynamic File Management
- **Hierarchical file tree** with expand/collapse functionality
- **File operations**: Create, rename, delete files and folders
- **Context menus** for quick access to file operations
- **Real-time updates** after file changes
- **File type icons** and color-coded indicators

### Professional Code Editor
- **Multi-tab editing** with unsaved change indicators
- **Syntax highlighting** for 20+ languages (JavaScript, Python, Java, CSS, HTML, etc.)
- **Line numbers** with hover effects
- **Smart indentation** with Tab/Shift+Tab support (2 spaces)
- **Auto-closing brackets** and quotes `()`, `[]`, `{}`, `""`, `''`, ``` `` ```
- **Auto-indentation** on Enter key with intelligent bracket detection
- **Text selection** with click-and-drag and keyboard shortcuts
- **Auto-save** functionality (2 seconds after inactivity)
- **Manual save** with Ctrl+S and Ctrl+Shift+S shortcuts
- **Save status indicators** (unsaved, saving, saved, error states)

### Repository & Project Management
- **Repository dashboard** with grid view of all repositories
- **Project template system** for quick repository scaffolding
  - Basic HTML template
  - React Frontend template
  - Python Flask template
  - Node.js Backend template
- **Template variables** (project_name, author, description)
- **Access control** with team member management
- **Repository navigation** with breadcrumbs and dropdown selector

### Collaboration & Task Management
- **User authentication** with session-based security
- **Team member access control**
- **Task management system** integrated with projects
- **Real-time collaboration** support

### Modern UI/UX
- **Dark theme** with professional color scheme
- **Responsive design** optimized for various screen sizes
- **Loading states** and comprehensive error handling
- **Smooth transitions** and hover effects
- **Status indicators** throughout the interface

---

## Tech Stack

### **Backend**
- **Framework**: Django 4.2.23
- **API**: Django REST Framework 3.16.1
- **Database**: MongoDB with MongoEngine 0.29.1
- **Authentication**: Session-based authentication with custom MongoEngine integration
- **CORS**: Django CORS Headers 4.7.0

### **Frontend**
- **Framework**: React 19.1.1
- **Routing**: React Router DOM 7.8.2
- **Code Highlighting**: Prism.js 1.30.0
- **Icons**: FontAwesome 7.0.1
- **Build Tool**: React Scripts 5.0.1

---

## Project Architecture

```
SAgile IDE
├── Backend (Django + MongoDB)
│   ├── RESTful API Layer
│   ├── MongoEngine ODM
│   ├── Session Authentication
│   └── Template Service
│
└── Frontend (React)
    ├── Component-based Architecture
    ├── Custom Code Editor
    ├── Syntax Highlighting
    └── API Service Layer
```

### **Key Design Decisions:**
- **Function-based views**: All backend views use function-based approach due to MongoEngine/DRF ModelSerializer incompatibility
- **Session authentication**: Secure session-based authentication without JWT tokens
- **Transparent overlay editor**: Dual-layer approach for syntax highlighting with text selection
- **Template system**: JSON-based project templates with variable substitution

---

## Prerequisites

Before you begin, ensure you have the following installed:

- **Python 3.8+** ([Download Python](https://www.python.org/downloads/))
- **Node.js 14+** and **npm** ([Download Node.js](https://nodejs.org/))
- **MongoDB** (local or cloud instance)
  - [MongoDB Community Edition](https://www.mongodb.com/try/download/community) or
  - [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (cloud database)
- **Git** ([Download Git](https://git-scm.com/downloads))

### **MongoDB Setup:**

#### Option 1: Local MongoDB
```bash
# Ubuntu/Debian
sudo apt-get install mongodb

# macOS (using Homebrew)
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB service
sudo systemctl start mongodb  # Linux
brew services start mongodb-community  # macOS
```

#### Option 2: MongoDB Atlas (Cloud)
1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster
3. Get your connection string
4. Update `settings.py` with your connection string

---

## Installation

### **1. Clone the Repository**

```bash
git clone https://github.com/mohamadazafri/sagile-ide.git
cd sagile-ide
```

### **2. Backend Setup**

#### **Step 2.1: Create Virtual Environment**

```bash
cd sagile_ide_backend
python3 -m venv venv
```

#### **Step 2.2: Activate Virtual Environment**

```bash
# Linux/macOS
source venv/bin/activate

# Windows
venv\Scripts\activate
```

#### **Step 2.3: Install Dependencies**

```bash
cd sagile_ide
pip install django==4.2.23
pip install djangorestframework==3.16.1
pip install mongoengine==0.29.1
pip install django-cors-headers==4.7.0
pip install pymongo==4.14.1
```

Or create a `requirements.txt` file:
```bash
# In sagile_ide_backend/sagile_ide directory
pip freeze > requirements.txt
```

Then install with:
```bash
pip install -r requirements.txt
```

#### **Step 2.4: Configure MongoDB Connection**

Open `sagile_ide_backend/sagile_ide/sagile_ide/settings.py` and update MongoDB settings:

```python
# Find the MONGODB_DATABASES section and update:
MONGODB_DATABASES = {
    'default': {
        'name': 'sagile_ide_db',
        'host': 'localhost',  # or your MongoDB Atlas connection string
        'port': 27017,
        'username': '',  # Add if using authentication
        'password': '',  # Add if using authentication
    }
}
```

#### **Step 2.5: Run Migrations**

```bash
# Make sure you're in sagile_ide_backend/sagile_ide directory
python manage.py migrate
```

#### **Step 2.6: Create Superuser (Optional)**

```bash
python manage.py createsuperuser
```

### **3. Frontend Setup**

#### **Step 3.1: Navigate to Frontend Directory**

```bash
# From project root
cd sagile_ide_frontend
```

#### **Step 3.2: Install Dependencies**

```bash
npm install
```

This will install all dependencies from `package.json`:
- React and React DOM
- React Router DOM
- Prism.js for syntax highlighting
- FontAwesome for icons

---

## Running the Application

You'll need **two terminal windows** - one for backend, one for frontend.

### **Terminal 1: Start Backend Server**

```bash
# Navigate to backend directory
cd sagile_ide_backend/sagile_ide

# Activate virtual environment
source ../venv/bin/activate  # Linux/macOS
# or
..\venv\Scripts\activate  # Windows

# Start Django development server
python manage.py runserver 8000
```

**Backend will be available at:** `http://127.0.0.1:8000`

You should see:
```
Django version 4.2.23, using settings 'sagile_ide.settings'
Starting development server at http://127.0.0.1:8000/
Quit the server with CONTROL-C.
```

### **Terminal 2: Start Frontend Server**

```bash
# Navigate to frontend directory
cd sagile_ide_frontend

# Start React development server
npm start
```

**Frontend will be available at:** `http://localhost:3000`

The browser should automatically open. If not, navigate to `http://localhost:3000` manually.

You should see:
```
Compiled successfully!

You can now view sagile_ide_frontend in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://192.168.x.x:3000
```

---

## Project Structure

```
FYP_UTM/
├── README.md                           # This file
│
├── sagile_ide_backend/                 # Backend application
│   ├── venv/                           # Python virtual environment
│   └── sagile_ide/                     # Django project root
│       ├── manage.py                   # Django management script
│       ├── db.sqlite3                  # SQLite database for sessions
│       │
│       ├── sagile_ide/                 # Main project settings
│       │   ├── settings.py             # Django configuration
│       │   ├── urls.py                 # Main URL routing
│       │   └── wsgi.py                 # WSGI application
│       │
│       ├── users/                      # User authentication app
│       │   ├── models.py               # User model (MongoEngine)
│       │   ├── views.py                # Auth views (login, register)
│       │   ├── authentication.py       # Custom session authentication
│       │   └── urls.py                 # User routes
│       │
│       ├── projects/                   # Project management app
│       │   ├── models.py               # Project model
│       │   ├── views.py                # Project CRUD operations
│       │   └── urls.py                 # Project routes
│       │
│       ├── repositories/               # Repository management app
│       │   ├── models.py               # Repository & RepositoryFile models
│       │   ├── views.py                # Repository/File CRUD operations
│       │   ├── template_service.py     # Project template management
│       │   └── urls.py                 # Repository routes
│       │
│       ├── tasks/                      # Task management app
│       │   ├── models.py               # Task model
│       │   ├── views.py                # Task operations
│       │   └── urls.py                 # Task routes
│       │
│       └── templates/                  # Project templates
│           └── project_templates/      # JSON template files
│               ├── basic_html.json
│               ├── react_frontend.json
│               ├── python_flask.json
│               └── node_backend.json
│
└── sagile_ide_frontend/                # Frontend application
    ├── package.json                    # NPM dependencies
    ├── public/                         # Static assets
    │   └── index.html                  # HTML template
    │
    └── src/                            # React source code
        ├── App.js                      # Main application component
        ├── index.js                    # React entry point
        ├── index.css                   # Global styles
        │
        ├── components/                 # React components
        │   ├── Login.js                # Authentication component
        │   ├── RepositoryDashboard.js  # Repository listing
        │   ├── RepositoryCreation.js   # Create new repository
        │   ├── ProjectInitialization.js # Template selection
        │   ├── AccessControl.js        # Team member management
        │   ├── Header.js               # IDE header with navigation
        │   ├── LeftPanel.js            # File explorer container
        │   ├── FileExplorer.js         # Dynamic file tree
        │   ├── FileOperationsModal.js  # File CRUD modal
        │   ├── Editor.js               # Main editor with tabs
        │   ├── CodeEditor.js           # Code editor component
        │   └── SyntaxHighlighter.js    # Prism.js integration
        │
        ├── services/                   # API services
        │   └── api.js                  # API client with fetch
        │
        └── styles/                     # Component styles
            ├── App.css                 # Main application styles
            ├── Login.css               # Login page styles
            ├── RepositoryCreation.css  # Repository creation styles
            └── RepositoryDashboard.css # Dashboard styles
```

---

## API Documentation

### **Base URL**
```
http://127.0.0.1:8000/api/
```

### **Authentication Endpoints**

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/users/register/` | Register new user |
| POST | `/users/login/` | User login |
| POST | `/users/logout/` | User logout |
| GET | `/users/current/` | Get current user info |

### **Repository Endpoints**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/repositories/` | List all repositories |
| POST | `/repositories/create/` | Create new repository |
| GET | `/repositories/{id}/` | Get repository details |
| PUT | `/repositories/{id}/update/` | Update repository |
| DELETE | `/repositories/{id}/delete/` | Delete repository |

### **File Endpoints**

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/repositories/{id}/files/create/` | Create new file |
| PUT | `/repositories/{id}/files/{path}/update/` | Update file content |
| DELETE | `/repositories/{id}/files/{path}/delete/` | Delete file |

### **Template Endpoints**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/repositories/templates/` | List all templates |
| GET | `/repositories/templates/{id}/preview/` | Preview template |
| POST | `/repositories/templates/create/` | Create custom template |

### **Project Endpoints**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/projects/` | List all projects |
| POST | `/projects/create/` | Create new project |
| GET | `/projects/{id}/` | Get project details |
| GET | `/projects/{id}/members/` | Get project members |

---

## Usage Guide

### **1. Getting Started**

1. **Start both servers** (backend and frontend)
2. **Open browser** to `http://localhost:3000`
3. **Register an account** or login if you already have one

### **2. Creating a Project**

1. After login, you'll see the **project selection** screen
2. Click **"+ Create New Project"**
3. Fill in project details:
   - Project Name
   - Description
   - Access Level (private/team/public)
4. Click **"Create Project"**

### **3. Creating a Repository**

1. Inside a project, click **"+ Create Repository"**
2. Choose **project type**:
   - **Fresh Project**: Start from scratch
   - **Template Project**: Use a pre-built template
3. If using a template:
   - Select a template (HTML, React, Flask, Node.js)
   - Configure template variables
4. Click **"Create Repository"**

### **4. Working in the IDE**

#### **File Operations:**
- **Create File/Folder**: Right-click in file explorer → New File/Folder
- **Rename**: Right-click file → Rename
- **Delete**: Right-click file → Delete

#### **Editing Code:**
- **Open File**: Click on file in the tree
- **Multiple Tabs**: Open multiple files simultaneously
- **Save**: 
  - Auto-save after 2 seconds of inactivity
  - Manual save: `Ctrl+S` (current file) or `Ctrl+Shift+S` (all files)
- **Smart Features**:
  - `Tab`: Indent (2 spaces)
  - `Shift+Tab`: Un-indent
  - `Enter`: Auto-indent based on context
  - Auto-closing brackets/quotes

#### **Navigation:**
- **Breadcrumbs**: Click "Repositories" to go back to dashboard
- **Repository Dropdown**: Switch between repositories
- **File Tree**: Expand/collapse folders

### **5. Team Collaboration**

1. Go to **Access Control** tab
2. Add team members by email
3. Assign roles (owner, editor, viewer)
4. Members can access shared projects

---

## Configuration

### **Backend Configuration**

Edit `sagile_ide_backend/sagile_ide/sagile_ide/settings.py`:

```python
# MongoDB Connection
MONGODB_DATABASES = {
    'default': {
        'name': 'your_database_name',
        'host': 'your_mongodb_host',
        'port': 27017,
    }
}

# CORS Settings (for production)
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "https://your-production-domain.com",
]

# Session Settings
SESSION_COOKIE_AGE = 86400  # 24 hours
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SECURE = False  # Set to True in production with HTTPS
```

### **Frontend Configuration**

Edit `sagile_ide_frontend/package.json`:

```json
{
  "proxy": "http://127.0.0.1:8000"  // Backend URL
}
```

---

## Troubleshooting

### **Common Issues:**

#### **1. MongoDB Connection Error**
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Solution**: Make sure MongoDB is running
```bash
# Linux
sudo systemctl start mongodb

# macOS
brew services start mongodb-community
```

#### **2. Port Already in Use**
```
Error: That port is already in use.
```
**Solution**: Kill the process or use a different port
```bash
# Backend - different port
python manage.py runserver 8001

# Frontend - different port
PORT=3001 npm start
```

#### **3. CORS Error**
```
Access to fetch at 'http://127.0.0.1:8000' has been blocked by CORS policy
```
**Solution**: Check `CORS_ALLOWED_ORIGINS` in `settings.py`

#### **4. Module Not Found**
```
ModuleNotFoundError: No module named 'rest_framework'
```
**Solution**: Make sure virtual environment is activated and dependencies are installed
```bash
source venv/bin/activate
pip install -r requirements.txt
```

---

## Deployment

### **Production Checklist:**

1. **Backend:**
   - Set `DEBUG = False` in `settings.py`
   - Use a production-grade database (MongoDB Atlas)
   - Set up proper environment variables
   - Use Gunicorn or uWSGI
   - Set `SESSION_COOKIE_SECURE = True`
   - Configure proper CORS settings

2. **Frontend:**
   - Build production bundle: `npm run build`
   - Deploy to static hosting (Netlify, Vercel, etc.)
   - Update API endpoint in production

3. **Database:**
   - Use MongoDB Atlas for cloud database
   - Set up proper indexes
   - Enable authentication
   - Configure backup strategy

---

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## Authors

- **Your Name** - *Initial work* - [YourGitHub](https://github.com/yourusername)

---

## Acknowledgments

- Django and Django REST Framework teams
- React team
- MongoEngine developers
- Prism.js for syntax highlighting
- FontAwesome for icons

---

## Support

For support, email support@sagileide.com or open an issue on GitHub.

---

## Roadmap

### **Upcoming Features:**
- [ ] Search & Replace System
- [ ] Go to Line Feature
- [ ] Enhanced Clipboard Operations
- [ ] Multiple Theme Support
- [ ] Integrated Terminal
- [ ] Performance Optimizations
- [ ] Git Integration
- [ ] Code Analytics
- [ ] AI-powered Code Suggestions

---

**Made with love by the SAgile IDE Team**
