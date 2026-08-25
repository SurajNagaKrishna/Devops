import { useState } from "react";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import api from "../services/api";
import "../styles/Dashboard.css";

const NAV_ITEMS = [
  { label: "Overview",       icon: "⊞",  path: "/admin"             },
  { label: "Teams",          icon: "◫",  path: "/admin/teams"       },
  { label: "Register User",  icon: "＋",  path: "/admin/register"   },
];

export default function AdminDashboard() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await api.get("/logout");
    } catch (error) {
      console.error("Logout failed", error);
    }
    navigate("/");
  };

  return (
    <div className="dashboard-root">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">T</div>
          <span className="sidebar-logo-text">TaskFlow</span>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-label">Main Menu</div>
          <ul className="sidebar-nav">
            {NAV_ITEMS.map(item => (
              <li key={item.path} className="sidebar-nav-item">
                <button
                  className={`sidebar-nav-link ${location.pathname === item.path ? "active" : ""}`}
                  onClick={() => navigate(item.path)}
                >
                  <span className="sidebar-nav-icon">{item.icon}</span>
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="sidebar-bottom">
          <button className="sidebar-logout" onClick={handleLogout} disabled={loggingOut}>
            <span className="sidebar-nav-icon">↩</span>
            {loggingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="main-wrapper">
        {/* Navbar */}
        <header className="navbar">
          <span className="navbar-title">
            {NAV_ITEMS.find(n => n.path === location.pathname)?.label ?? "Admin"}
          </span>
          <div className="navbar-right">
            <span className="navbar-role">Admin</span>
            <div className="navbar-avatar">A</div>
          </div>
        </header>

        {/* Page content rendered by child routes */}
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}