import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  RadialBarChart, RadialBar, Legend
} from "recharts";
import api, { apiErrorMessage } from "../services/api";
import ErrorState from "../components/ErrorState";
import NoTeamLanding from "../components/NoTeamLanding";

const STATUS_COLORS = {
  Completed:    "#22C55E",
  "In Progress":"#6366F1",
  Pending:      "#F59E0B",
};

const PRIORITY_COLORS = {
  High:   "#EF4444",
  Medium: "#6366F1",
  Low:    "#22C55E",
};

// Custom label for pie charts
const renderCustomLabel = ({ name, percent }) =>
  percent > 0 ? `${name} ${(percent * 100).toFixed(0)}%` : "";

export default function ManagerOverview() {
  const navigate = useNavigate();
  const [stats,   setStats]   = useState(null);
  const [tasks,   setTasks]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [noTeam,  setNoTeam]  = useState(false);

  const loadDashboard = () => {
    setLoading(true);
    setError("");
    setNoTeam(false);
    Promise.allSettled([
      api.get("/teammanager/dashboard"),
      api.get("/teammanager/tasksdashboard"),
    ]).then(([statsRes, tasksRes]) => {
      if (statsRes.status === "rejected") {
        if (statsRes.reason.response?.status === 404) setNoTeam(true);
        else setError(apiErrorMessage(statsRes.reason, "Failed to load dashboard data."));
      } else if (!statsRes.value.data || typeof statsRes.value.data !== "object" ||
        ["teamMembers", "pendingInvitations", "totalTasks", "completedTasks", "pendingTasks", "inProgressTasks"]
          .some(key => typeof statsRes.value.data[key] !== "number")) {
        setError("The dashboard returned an unexpected response.");
      } else {
        setStats(statsRes.value.data);
      }
      if (tasksRes.status === "fulfilled") {
        const raw = tasksRes.value.data.tasks || [];
        if (!Array.isArray(raw)) {
          setError("The task dashboard returned an unexpected response.");
          return;
        }
        // Deduplicate by task_id
        const seen = new Set();
        const deduped = [];
        raw.forEach(r => {
          if (!seen.has(r.task_id)) { seen.add(r.task_id); deduped.push(r); }
        });
        setTasks(deduped);
      } else if (tasksRes.reason.response?.status !== 404) {
        setError(apiErrorMessage(tasksRes.reason, "Failed to load task data."));
      }
    })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void Promise.resolve().then(loadDashboard);
  }, []);

  // ── Derived chart data ─────────────────────────────────

  // 1. Status breakdown
  const statusData = stats ? [
    { name: "Completed",   value: stats.completedTasks   },
    { name: "In Progress", value: stats.inProgressTasks  },
    { name: "Pending",     value: stats.pendingTasks      },
  ].filter(d => d.value > 0) : [];

  // 2. Priority breakdown
  const priorityCounts = tasks.reduce((acc, t) => {
    acc[t.priority] = (acc[t.priority] || 0) + 1;
    return acc;
  }, {});
  const priorityData = Object.entries(priorityCounts).map(([name, value]) => ({ name, value }));

  // 3. Tasks per member
  const memberCounts = tasks.reduce((acc, t) => {
    const name = `${t.firstname} ${t.lastname}`;
    if (!acc[name]) acc[name] = { name, Total: 0, Completed: 0, Pending: 0 };
    acc[name].Total += 1;
    if (t.status === "Completed")   acc[name].Completed += 1;
    else                             acc[name].Pending   += 1;
    return acc;
  }, {});
  const memberData = Object.values(memberCounts);

  // 4. Overdue vs On-time vs No deadline
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let overdue = 0, onTime = 0, noDl = 0;
  tasks.forEach(t => {
    if (t.status === "Completed") return;
    if (!t.deadline)              { noDl++;   return; }
    if (new Date(t.deadline) < today) overdue++;
    else                              onTime++;
  });
  const deadlineData = [
    { name: "Overdue",     value: overdue, fill: "#EF4444" },
    { name: "On Time",     value: onTime,  fill: "#22C55E" },
    { name: "No Deadline", value: noDl,    fill: "#94A3B8" },
  ].filter(d => d.value > 0);

  // 5. Completion rate for radial bar
  const completionRate = stats?.totalTasks > 0
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
    : 0;
  const radialData = [{ name: "Completion Rate", value: completionRate, fill: "#6366F1" }];

  // ── Stat cards ─────────────────────────────────────────
  const statCards = stats ? [
    { label: "Team Members",        value: stats.teamMembers,        accent: true  },
    { label: "Pending Invitations", value: stats.pendingInvitations, accent: false },
    { label: "Total Tasks",         value: stats.totalTasks,         accent: false },
    { label: "Completed",           value: stats.completedTasks,     accent: false },
    { label: "In Progress",         value: stats.inProgressTasks,    accent: false },
    { label: "Pending",             value: stats.pendingTasks,       accent: false },
  ] : [];

  const ColorDot = ({ color, label }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
      <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
      {label}
    </div>
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Overview</h1>
          <p>Your team performance and task analytics.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-ghost" onClick={() => navigate("/manager/team")}>
            Manage Team
          </button>
          <button className="btn btn-accent" onClick={() => navigate("/manager/tasks")}>
            + Create Task
          </button>
        </div>
      </div>

      {error && stats && <div className="error-msg">{error}</div>}

      {loading ? (
        <div className="spinner-wrap"><div className="spinner" /></div>
      ) : noTeam ? (
        <NoTeamLanding />
      ) : !stats ? (
        <ErrorState
          title="Unable to load your dashboard"
          message={error || "We couldn't retrieve your team dashboard."}
          actionLabel="Try Again"
          onAction={loadDashboard}
        />
      ) : (
        <>
          {/* ── Stat Cards ── */}
          <div className="stats-grid" style={{ marginBottom: 24 }}>
            {statCards.map(c => (
              <div key={c.label} className={`card stat-card ${c.accent ? "stat-accent" : ""}`}>
                <div className="stat-label">{c.label}</div>
                <div className="stat-value">{c.value ?? 0}</div>
              </div>
            ))}
          </div>

          {stats?.totalTasks === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon">✓</div>
                <p>No tasks yet. Create tasks to see analytics here.</p>
              </div>
            </div>
          ) : (
            <>
              {/* ── Row 1: Status + Completion Rate ── */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>

                {/* Status donut */}
                <div className="card">
                  <div className="card-header"><h2>Task Status Breakdown</h2></div>
                  <div style={{ padding: "20px 16px" }}>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={statusData} cx="50%" cy="50%"
                          innerRadius={55} outerRadius={85} paddingAngle={4}
                          dataKey="value" label={renderCustomLabel} labelLine={false}
                        >
                          {statusData.map(e => <Cell key={e.name} fill={STATUS_COLORS[e.name]} />)}
                        </Pie>
                        <Tooltip formatter={v => [`${v} tasks`]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 8 }}>
                      {Object.entries(STATUS_COLORS).map(([name, color]) => (
                        <ColorDot key={name} color={color} label={name} />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Completion rate radial */}
                <div className="card">
                  <div className="card-header"><h2>Overall Completion Rate</h2></div>
                  <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <ResponsiveContainer width="100%" height={180}>
                      <RadialBarChart
                        cx="50%" cy="50%"
                        innerRadius="60%" outerRadius="90%"
                        data={radialData}
                        startAngle={180} endAngle={-180}
                      >
                        <RadialBar dataKey="value" cornerRadius={10} background={{ fill: "#F1F5F9" }} />
                        <Tooltip formatter={v => [`${v}%`, "Completion"]} />
                      </RadialBarChart>
                    </ResponsiveContainer>
                    <div style={{ textAlign: "center", marginTop: -12 }}>
                      <div style={{ fontSize: 36, fontWeight: 700, color: "var(--color-accent)" }}>
                        {completionRate}%
                      </div>
                      <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                        {stats.completedTasks} of {stats.totalTasks} tasks completed
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Row 2: Priority + Deadline ── */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>

                {/* Priority pie */}
                <div className="card">
                  <div className="card-header"><h2>Tasks by Priority</h2></div>
                  <div style={{ padding: "20px 16px" }}>
                    {priorityData.length === 0 ? (
                      <div className="empty-state"><p>No priority data.</p></div>
                    ) : (
                      <>
                        <ResponsiveContainer width="100%" height={200}>
                          <PieChart>
                            <Pie data={priorityData} cx="50%" cy="50%"
                              outerRadius={80} paddingAngle={3}
                              dataKey="value" label={renderCustomLabel} labelLine={false}
                            >
                              {priorityData.map(e => (
                                <Cell key={e.name} fill={PRIORITY_COLORS[e.name] || "#94A3B8"} />
                              ))}
                            </Pie>
                            <Tooltip formatter={v => [`${v} tasks`]} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 8 }}>
                          {Object.entries(PRIORITY_COLORS).map(([name, color]) => (
                            <ColorDot key={name} color={color} label={name} />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Deadline status */}
                <div className="card">
                  <div className="card-header"><h2>Deadline Status</h2></div>
                  <div style={{ padding: "20px 16px" }}>
                    {deadlineData.length === 0 ? (
                      <div className="empty-state"><p>No deadline data.</p></div>
                    ) : (
                      <>
                        <ResponsiveContainer width="100%" height={200}>
                          <PieChart>
                            <Pie data={deadlineData} cx="50%" cy="50%"
                              outerRadius={80} paddingAngle={3}
                              dataKey="value" label={renderCustomLabel} labelLine={false}
                            >
                              {deadlineData.map(e => <Cell key={e.name} fill={e.fill} />)}
                            </Pie>
                            <Tooltip formatter={v => [`${v} tasks`]} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 8 }}>
                          {deadlineData.map(e => (
                            <ColorDot key={e.name} color={e.fill} label={e.name} />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Row 3: Tasks per Member ── */}
              {memberData.length > 0 && (
                <div className="card" style={{ marginBottom: 20 }}>
                  <div className="card-header"><h2>Tasks per Team Member</h2></div>
                  <div style={{ padding: "20px 16px" }}>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={memberData} barSize={32}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748B" }} axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748B" }} axisLine={false} tickLine={false} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="Completed" stackId="a" fill="#22C55E" radius={[0,0,0,0]} />
                        <Bar dataKey="Pending"   stackId="a" fill="#F59E0B" radius={[6,6,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* ── Overdue alert ── */}
              {overdue > 0 && (
                <div style={{
                  background: "#FEF2F2", border: "1px solid #FECACA",
                  borderRadius: "var(--radius-md)", padding: "14px 18px",
                  display: "flex", alignItems: "center", gap: 12
                }}>
                  <span style={{ fontSize: 20 }}>⚠️</span>
                  <div>
                    <strong style={{ color: "#DC2626" }}>
                      {overdue} task{overdue > 1 ? "s are" : " is"} overdue!
                    </strong>
                    <p style={{ fontSize: 13, color: "#DC2626", marginTop: 2 }}>
                      Review and update deadlines or reassign these tasks.
                    </p>
                  </div>
                  <button
                    className="btn btn-sm"
                    style={{ marginLeft: "auto", background: "#DC2626", color: "#fff", border: "none" }}
                    onClick={() => navigate("/manager/tasks")}
                  >
                    View Tasks →
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </>
  );
}