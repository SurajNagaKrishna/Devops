import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Login from "./Login";
import api from "../services/api";
import "../styles/LandingPage.css";

export default function LandingPage() {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    let active = true;
    api.get("/auth/me")
      .then(({ data }) => {
        if (active && data.user) {
          if (data.user.role === "Admin") window.location.href = "/admin";
          else if (data.user.role === "Team Manager") window.location.href = "/manager";
          else window.location.href = "/employee";
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setCheckingAuth(false);
      });
    return () => { active = false; };
  }, []);

  if (checkingAuth) {
    return <div className="landing-loading">Loading TaskFlow...</div>;
  }

  return (
    <div className="landing-container">
      {/* Dynamic Ambient Background Elements */}
      <div className="gradient-orb orb-1"></div>
      <div className="gradient-orb orb-2"></div>
      <div className="gradient-orb orb-3"></div>

      {/* Header Navigation */}
      <nav className="landing-nav">
        <div className="nav-brand">
          <div className="brand-logo">T</div>
          <span className="brand-name">TaskFlow</span>
        </div>
        <div className="nav-links">
          <a href="#features">Features</a>
          <a href="#workflows">Workflows</a>
          <a href="#architecture">DevOps & Stack</a>
          <button className="nav-login-btn" onClick={() => setShowLoginModal(true)}>
            Sign In
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="hero-section">
        <div className="hero-badge">
          <span className="badge-pulse"></span>
          Enterprise Task & Team Orchestration
        </div>
        <h1 className="hero-title">
          Empower Your Teams with <span className="text-gradient">TaskFlow</span>
        </h1>
        <p className="hero-subtitle">
          The all-in-one DevOps platform connecting Admins, Team Managers, and Employees.
          Streamline role-based tasks, monitor sprint progress, and elevate team efficiency.
        </p>
        <div className="hero-actions">
          <button className="btn-hero-primary" onClick={() => setShowLoginModal(true)}>
            Get Started Now →
          </button>
          <a href="#features" className="btn-hero-secondary">
            Explore Features
          </a>
        </div>

        {/* Floating Metrics Showcase */}
        <div className="hero-metrics">
          <div className="metric-card">
            <span className="metric-number">99.9%</span>
            <span className="metric-label">Pipeline Uptime</span>
          </div>
          <div className="metric-card">
            <span className="metric-number">3 Roles</span>
            <span className="metric-label">RBAC Security</span>
          </div>
          <div className="metric-card">
            <span className="metric-number">Real-Time</span>
            <span className="metric-label">Task Sync</span>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="section-header">
          <h2>Tailored for Every Workspace Role</h2>
          <p>TaskFlow delivers scoped views and actionable metrics depending on your organizational permissions.</p>
        </div>

        <div className="features-grid">
          <div className="feature-card glass-panel">
            <div className="feature-icon icon-purple">👑</div>
            <h3>Admin Governance</h3>
            <p>Full workspace oversight. Register new users, construct departments, assign managers, and analyze high-level metrics.</p>
          </div>

          <div className="feature-card glass-panel">
            <div className="feature-icon icon-blue">⚡</div>
            <h3>Manager Orchestration</h3>
            <p>Create sprints, assign deliverables, track completion percentages, and manage direct reports effortlessly.</p>
          </div>

          <div className="feature-card glass-panel">
            <div className="feature-icon icon-emerald">🚀</div>
            <h3>Employee Workspace</h3>
            <p>Intuitive task queue, status updating (To Do, In Progress, Done), and automated team invitation handling.</p>
          </div>
        </div>
      </section>

      {/* DevOps & Architecture Section */}
      <section id="architecture" className="architecture-section">
        <div className="glass-card-wide">
          <div className="arch-content">
            <h2>Built for Continuous Integration & Cloud Deployment</h2>
            <p>
              TaskFlow is containerized with Docker, covered by automated unit and E2E testing with Vitest & Supertest, and continuously deployed to Render PostgreSQL & Cloud Services.
            </p>
            <div className="tech-pills">
              <span className="pill">React 19</span>
              <span className="pill">Node.js Express</span>
              <span className="pill">PostgreSQL</span>
              <span className="pill">Docker</span>
              <span className="pill">GitHub Actions</span>
              <span className="pill">Render Cloud</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-left">
          <div className="brand-logo sm">T</div>
          <span>TaskFlow Platform © 2026. All rights reserved.</span>
        </div>
        <div className="footer-links">
          <button onClick={() => setShowLoginModal(true)}>Sign In</button>
        </div>
      </footer>

      {/* Login Modal Overlay */}
      {showLoginModal && (
        <div className="modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowLoginModal(false)}>✕</button>
            <Login />
          </div>
        </div>
      )}
    </div>
  );
}
