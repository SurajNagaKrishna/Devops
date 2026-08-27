# 🚀 TaskFlow - DevOps & Project Management Platform

TaskFlow is an enterprise-grade, full-stack project management, team collaboration, and task tracking platform designed for modern software development and DevOps workflows. Built with a scalable Node.js/Express REST API backend, a responsive React (Vite) frontend, and complete CI/CD containerized deployment pipelines.

---

## 🌟 Key Features

### 👥 Role-Based Workflows
- **👑 Admin**: System-wide dashboard, user role management, initial admin seeding script (`seedAdmin.js`).
- **👔 Manager / Team Lead**:
  - Create and manage team structures.
  - Send employee team invitations.
  - Create, assign, and track project tasks with deadlines and priorities.
  - Monitor team overview metrics and performance.
- **👷 Employee / Team Member**:
  - Personal dashboard with assigned tasks.
  - Review and accept/reject team invitations.
  - Update task progress and completion status (Pending, In Progress, Completed).
  - Collaborate within team workspaces.

### 🔐 Authentication & Security
- **JWT (JSON Web Tokens)** session handling via HTTP-only cookies and Authorization headers.
- **Google OAuth 2.0 Single Sign-On** integration (`@react-oauth/google`).
- **Password Hashing** with `bcrypt`.
- **CORS Protection** & dynamic environment variable origin matching.

### 🛠️ DevOps & CI/CD Pipelines
- **Docker Containerization**: Unified container build configuration for Node.js Express server serving production Vite React assets.
- **GitHub Actions Integration**:
  - **CI Workflow (`ci.yml`)**: Automated linting, frontend unit tests (Vitest), backend unit/integration/E2E test suite with live PostgreSQL service container, and Docker image build verification.
  - **CD Workflow (`cd.yml`)**: Continuous deployment pipeline automating container builds, deployment checks, and application health verification.
- **Jenkins Pipeline (`Jenkinsfile`)**: Declarative pipeline for automated checkout, building Docker images, and managing container lifecycles.
- **Infrastructure as Code (`render.yaml`)**: Cloud deployment configuration tailored for Render platform web services.

---

## 🏗️ Technology Stack

| Domain | Technologies / Frameworks |
|---|---|
| **Frontend** | React 18, Vite, React Router DOM v6, `@react-oauth/google`, Lucide React Icons, Vanilla CSS |
| **Backend** | Node.js, Express.js (v5), JWT (`jsonwebtoken`), Bcrypt, `cookie-parser`, `nodemailer`, CORS |
| **Database** | PostgreSQL (`pg`), MySQL support (`mysql2`), SQL schema DDL (`register.sql`) |
| **Testing** | Vitest, Supertest, React Testing Library, `mock-require` |
| **DevOps & Infrastructure** | Docker, GitHub Actions, Jenkins, Render |

---

## 📁 Repository Structure

```text
Devops-Project/
├── .github/
│   └── workflows/
│       ├── ci.yml                 # GitHub Actions Continuous Integration workflow
│       └── cd.yml                 # GitHub Actions Continuous Deployment workflow
├── Devops/
│   ├── backend/                   # Express.js REST API Backend
│   │   ├── routes/                # API Route Handlers
│   │   │   ├── auth.js            # JWT Authentication middleware
│   │   │   ├── Employee.js        # Employee task & dashboard endpoints
│   │   │   ├── getteams.js        # Team lookup endpoints
│   │   │   ├── login.js           # Login & Google OAuth endpoint
│   │   │   ├── logout.js          # Logout cookie handler
│   │   │   ├── register.js        # User registration endpoint
│   │   │   ├── resetpassword.js   # Forgot & Reset password routes
│   │   │   └── teammanager.js     # Manager team & task management APIs
│   │   ├── db.js                  # Database connection pool (PostgreSQL/MySQL)
│   │   ├── register.sql           # Database DDL schema setup
│   │   ├── server.js              # Express app entrypoint & static frontend server
│   │   └── transaction.js         # Transaction management helper
│   ├── frontend/                  # React + Vite Single Page Application
│   │   ├── src/
│   │   │   ├── components/        # Reusable UI components (ErrorState, NoTeamLanding)
│   │   │   ├── pages/             # Page Views (Dashboards, Auth, Teams, Tasks)
│   │   │   ├── services/          # Axios/Fetch API service client
│   │   │   ├── styles/            # Responsive CSS stylesheets
│   │   │   ├── App.jsx            # React Router setup
│   │   │   └── main.jsx           # Entrypoint with Google OAuth Provider
│   │   ├── index.html
│   │   ├── vite.config.js
│   │   └── vitest.config.js
│   ├── tests/                     # Automated Test Suites
│   │   ├── unit/                  # Unit tests (API helpers, validation, transactions)
│   │   ├── integration/           # Integration tests (auth flow, team management)
│   │   └── e2e/                   # End-to-end user journey tests
│   ├── Dockerfile                 # Production Docker image build file
│   ├── Jenkinsfile                # Jenkins pipeline specification
│   ├── seedAdmin.js               # Initial administrator creation script
│   └── package.json               # Backend dependencies & test scripts
├── render.yaml                    # Cloud deployment configuration for Render
└── README.md                      # Project Documentation
```

---

## ⚡ Quick Start & Local Setup

### Prerequisites
- **Node.js**: v20.x or higher
- **PostgreSQL**: v15 or higher (or compatible database)
- **Docker**: Optional, for running containerized builds

### 1. Clone the Repository
```bash
git clone https://github.com/SurajNagaKrishna/Devops.git
cd Devops-Project/Devops
```

### 2. Environment Configuration

#### Backend (`Devops/backend/.env`)
Create a `.env` file inside `Devops/backend/`:
```env
PORT=2000
JWT_SECRET_KEY=your_jwt_secret_key
DB_USER=taskflow_user
DB_HOST=localhost
DB_DATABASE=taskflow_db
DB_PASSWORD=taskflow_password
DB_PORT=5432
DB_SSL=false
CORS_ORIGIN=http://localhost:5173
```

#### Frontend (`Devops/frontend/.env`)
Create a `.env` file inside `Devops/frontend/`:
```env
VITE_API_URL=http://localhost:2000
VITE_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
```

### 3. Database Initialization
Run the database DDL script against your local PostgreSQL instance:
```bash
psql -h localhost -U taskflow_user -d taskflow_db -f backend/register.sql
```

Optionally seed the default Administrator account:
```bash
node seedAdmin.js
```

### 4. Running Locally

#### Option A: Running Backend and Frontend separately
```bash
# Terminal 1 - Backend
cd Devops
npm install
npm start

# Terminal 2 - Frontend
cd Devops/frontend
npm install
npm run dev
```

#### Option B: Unified Production Build
```bash
cd Devops
npm install
cd frontend && npm install && npm run build && cd ..
npm start
```
Access the application at `http://localhost:2000`.

---

## 🧪 Testing Suite

TaskFlow comes equipped with comprehensive test suites covering unit logic, integration flows, and end-to-end user journeys using Vitest.

```bash
# Run Backend & Integration/E2E Tests
cd Devops
npm test

# Run Frontend Unit Tests
cd Devops/frontend
npx vitest run
```

---

## 🐳 Docker Deployment

To build and run the complete application inside a Docker container:

```bash
# Build the Docker image
cd Devops
docker build -t devops-app:latest .

# Run the container
docker run -d \
  -p 2000:2000 \
  --name devops-container \
  -e DB_HOST=host.docker.internal \
  -e JWT_SECRET_KEY=production_secret \
  devops-app:latest
```

The container exposes port `2000` for both the backend REST API and serving the React production application.

---

## 📜 License & Authors
Developed by **Team Iota** as part of the DevOps & Project Management Initiative.
