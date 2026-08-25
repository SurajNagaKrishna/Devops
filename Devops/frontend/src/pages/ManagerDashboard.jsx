import { useState } from "react";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import api from "../services/api";
import "../styles/Dashboard.css";

const NAV_ITEMS = [
  { label: "Overview",    icon: "⊞", path: "/manager"              },
  { label: "My Team",     icon: "◫", path: "/manager/team"         },
  { label: "Tasks",       icon: "✓", path: "/manager/tasks"        },
];

export default function ManagerDashboard() {
  const navigate     = useNavigate();
  const location     = useLocation();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try { await api.get("/logout"); }
    catch (error) { console.error("Logout failed", error); }
    navigate("/");
  };

  const activeLabel = NAV_ITEMS.find(n =>
    location.pathname === n.path ||
    location.pathname.startsWith(n.path + "/")
  )?.label ?? "Manager";

  return (
    <div className="dashboard-root">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">T</div>
          <span className="sidebar-logo-text">TaskFlow</span>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-label">Manager Menu</div>
          <ul className="sidebar-nav">
            {NAV_ITEMS.map(item => (
              <li key={item.path} className="sidebar-nav-item">
                <button
                  className={`sidebar-nav-link ${
                    location.pathname === item.path ||
                    (item.path !== "/manager" && location.pathname.startsWith(item.path))
                      ? "active" : ""
                  }`}
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

      <div className="main-wrapper">
        <header className="navbar">
          <span className="navbar-title">{activeLabel}</span>
          <div className="navbar-right">
            <span className="navbar-role">Team Manager</span>
            <div className="navbar-avatar">M</div>
          </div>
        </header>
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}