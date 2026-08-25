import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts";
import api, { apiErrorMessage } from "../services/api";

const COLORS = {
  Completed:    "#22C55E",
  "In Progress":"#6366F1",
  Pending:      "#F59E0B",
};

export default function EmployeeOverview() {
  const navigate = useNavigate();
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [noTeam,  setNoTeam]  = useState(false);

  useEffect(() => {
    // Derive stats from tasks endpoint
    Promise.allSettled([
      api.get("/employee/tasks"),
      api.get("/employee/viewteam"),
    ]).then(([tasksRes, teamRes]) => {
      if (teamRes.status === "rejected" && teamRes.reason.response?.status === 404) {
        setNoTeam(true);
      } else if (teamRes.status === "rejected") {
        setError(apiErrorMessage(teamRes.reason, "Failed to load team data."));
      } else if (!Array.isArray(teamRes.value.data.team)) {
        setError("The team response was unexpected.");
      } else if (teamRes.value.data.team.length === 0) {
        setNoTeam(true);
      }
      if (tasksRes.status === "rejected") {
        setError(apiErrorMessage(tasksRes.reason, "Failed to load overview."));
        return;
      }
      const data = tasksRes.value.data;
      const raw = data?.tasks;
      if (!Array.isArray(raw)) {
        setError("The task response was unexpected.");
        return;
      }

        // Deduplicate by task_id
        const seen = new Set();
        const tasks = [];
        raw.forEach(r => {
          if (!seen.has(r.task_id)) { seen.add(r.task_id); tasks.push(r); }
        });

        const total      = tasks.length;
        const completed  = tasks.filter(t => t.status === "Completed").length;
        const inProgress = tasks.filter(t => t.status === "In Progress").length;
        const pending    = tasks.filter(t => t.status === "Pending").length;

        setStats({ total, completed, inProgress, pending });
    })
      .finally(() => setLoading(false));
  }, []);

  const statCards = stats ? [
    { label: "Total Tasks",     value: stats.total,      accent: true  },
    { label: "Completed",       value: stats.completed,  accent: false },
    { label: "In Progress",     value: stats.inProgress, accent: false },
    { label: "Pending",         value: stats.pending,    accent: false },
  ] : [];

  const pieData = stats ? [
    { name: "Completed",   value: stats.completed  },
    { name: "In Progress", value: stats.inProgress },
    { name: "Pending",     value: stats.pending    },
  ].filter(d => d.value > 0) : [];

  const barData = stats ? [
    { name: "Completed",   Tasks: stats.completed  },
    { name: "In Progress", Tasks: stats.inProgress },
    { name: "Pending",     Tasks: stats.pending    },
  ] : [];

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Overview</h1>
          <p>Your task progress at a glance.</p>
        </div>
        <button className="btn btn-accent" onClick={() => navigate("/employee/tasks")}>
          View My Tasks →
        </button>
      </div>

      {error && stats && <div className="error-msg">{error}</div>}

      {loading ? (
        <div className="spinner-wrap"><div className="spinner" /></div>
      ) : (
        <>
          <div className="stats-grid" style={{ marginBottom: 28 }}>
            {statCards.map(c => (
              <div key={c.label} className={`card stat-card ${c.accent ? "stat-accent" : ""}`}>
                <div className="stat-label">{c.label}</div>
                <div className="stat-value">{c.value ?? 0}</div>
              </div>
            ))}
          </div>

          {noTeam ? (
            <div className="card"><div className="empty-state">
              <div className="empty-state-icon">◫</div>
              <p>No team assigned yet. Check Invitations for a team request.</p>
            </div></div>
          ) : error && !stats ? (
            <div className="card"><div className="empty-state"><p>{error}</p></div></div>
          ) : stats?.total > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div className="card">
                <div className="card-header"><h2>Task Status Breakdown</h2></div>
                <div style={{ padding: "20px 16px" }}>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%"
                        innerRadius={60} outerRadius={90} paddingAngle={4}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {pieData.map(e => <Cell key={e.name} fill={COLORS[e.name]} />)}
                      </Pie>
                      <Tooltip formatter={v => [`${v} tasks`]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 8 }}>
                    {Object.entries(COLORS).map(([name, color]) => (
                      <div key={name} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: color }} />
                        {name}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header"><h2>Tasks by Status</h2></div>
                <div style={{ padding: "20px 16px" }}>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={barData} barSize={40}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748B" }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748B" }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={v => [`${v} tasks`]} />
                      <Bar dataKey="Tasks" radius={[6, 6, 0, 0]}>
                        {barData.map(e => <Cell key={e.name} fill={COLORS[e.name]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon">✓</div>
                <p>No tasks assigned yet.</p>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}