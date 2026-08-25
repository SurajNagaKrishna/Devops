import { useEffect, useState } from "react";
import api, { apiErrorMessage } from "../services/api";
import ErrorState from "../components/ErrorState";

const PRIORITY_COLORS = {
  High:   { background: "#FEE2E2", color: "#DC2626" },
  Medium: { background: "#EEF2FF", color: "#4338CA" },
  Low:    { background: "#F1F5F9", color: "#64748B" },
};

export default function EmployeeTasks() {
  const [tasks,   setTasks]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  const fetchTasks = async () => {
    setLoading(true); setError("");
    try {
      const { data } = await api.get("/employee/tasks");
      const raw = data.tasks;
      if (!Array.isArray(raw)) {
        setError("The task response was unexpected.");
        return;
      }

      // Group by task_id, exclude completed tasks from view
      const grouped = {};
      raw.forEach(row => {
        if (!grouped[row.task_id]) {
          grouped[row.task_id] = {
            task_id:           row.task_id,
            title:             row.title,
            description:       row.description,
            priority:          row.priority,
            status:            row.status,
            deadline:          row.deadline,
            manager_firstname: row.manager_firstname,
            manager_lastname:  row.manager_lastname,
            subtasks: []
          };
        }
        if (row.subtask_id) {
          grouped[row.task_id].subtasks.push({
            subtask_id: row.subtask_id,
            title:      row.subtask_title,
            status:     row.subtask_status,
          });
        }
      });

      // Filter out completed tasks from view
      const active = Object.values(grouped).filter(t => t.status !== "Completed");
      setTasks(active);
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to load tasks."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(() => fetchTasks());
  }, []);

  // Toggle subtask done/pending
  const handleToggleSubtask = async (task, sub) => {
    const newStatus = sub.status === "Completed" ? "Pending" : "Completed";
    try {
      await api.put(`/employee/subtask/${sub.subtask_id}`, { status: newStatus });
      setTasks(prev => prev.map(t => {
        if (t.task_id !== task.task_id) return t;
        return {
          ...t,
          subtasks: t.subtasks.map(s =>
            s.subtask_id === sub.subtask_id ? { ...s, status: newStatus } : s
          )
        };
      }));
    } catch (err) {
      setError(apiErrorMessage(err, "We couldn't update the subtask. Please try again."));
    }
  };

  const deadlineColor = (deadline) => {
    if (!deadline) return "var(--color-text-muted)";
    const diff = new Date(deadline) - new Date();
    if (diff < 0)                        return "var(--color-danger)";
    if (diff < 2 * 24 * 60 * 60 * 1000) return "#F59E0B";
    return "var(--color-text-muted)";
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>My Tasks</h1>
          <p>Complete subtasks to make progress. Your manager can track your progress in real time.</p>
        </div>
        <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
          {tasks.length} active task{tasks.length !== 1 ? "s" : ""}
        </span>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {loading ? (
        <div className="spinner-wrap"><div className="spinner" /></div>
      ) : error ? (
        <ErrorState title="Unable to load your tasks" message={error} actionLabel="Try Again" onAction={fetchTasks} />
      ) : tasks.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">checkmark</div>
            <p>No active tasks. You are all caught up!</p>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {tasks.map(task => {
            const completedSubs = task.subtasks.filter(s => s.status === "Completed").length;
            const totalSubs     = task.subtasks.length;
            const pct           = totalSubs > 0 ? Math.round((completedSubs / totalSubs) * 100) : 0;
            const allDone       = totalSubs > 0 && completedSubs === totalSubs;

            return (
              <div key={task.task_id} className="card">
                <div style={{ padding: "20px 22px" }}>

                  {/* Task header */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 600 }}>{task.title}</h3>
                        <span className="badge" style={PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.Medium}>
                          {task.priority}
                        </span>
                        <span className="badge badge-blue">{task.status}</span>
                      </div>
                      <p style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                        Assigned by {task.manager_firstname} {task.manager_lastname}
                        {task.deadline && (
                          <>
                            {" · "}
                            <span style={{ color: deadlineColor(task.deadline) }}>
                              Due {new Date(task.deadline).toLocaleDateString()}
                            </span>
                          </>
                        )}
                      </p>
                    </div>

                    {/* Progress pill */}
                    <div style={{
                      fontSize: 13, fontWeight: 600, padding: "6px 14px",
                      borderRadius: "var(--radius-sm)",
                      background: allDone ? "#F0FDF4" : "var(--color-bg)",
                      border: `1px solid ${allDone ? "#BBF7D0" : "var(--color-border)"}`,
                      color: allDone ? "#15803D" : "var(--color-text-muted)",
                      whiteSpace: "nowrap"
                    }}>
                      {totalSubs > 0 ? `${completedSubs}/${totalSubs} subtasks done` : "No subtasks"}
                    </div>
                  </div>

                  {/* Description */}
                  {task.description && (
                    <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 14 }}>
                      {task.description}
                    </p>
                  )}

                  {/* Subtasks */}
                  {totalSubs > 0 && (
                    <div>
                      <div style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        marginBottom: 10
                      }}>
                        <span style={{
                          fontSize: 12, fontWeight: 600,
                          color: "var(--color-text-muted)",
                          textTransform: "uppercase", letterSpacing: "0.06em"
                        }}>
                          Subtasks
                        </span>
                        <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                          {pct}% complete
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div style={{
                        height: 6, background: "var(--color-border)",
                        borderRadius: 99, marginBottom: 12, overflow: "hidden"
                      }}>
                        <div style={{
                          height: "100%", borderRadius: 99,
                          background: allDone ? "#22C55E" : "var(--color-accent)",
                          width: `${pct}%`,
                          transition: "width 0.3s ease"
                        }} />
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {task.subtasks.map(sub => (
                          <div key={sub.subtask_id} style={{
                            display: "flex", alignItems: "center", gap: 10,
                            padding: "10px 14px",
                            background: sub.status === "Completed" ? "#F0FDF4" : "var(--color-bg)",
                            borderRadius: "var(--radius-sm)",
                            border: `1px solid ${sub.status === "Completed" ? "#BBF7D0" : "var(--color-border)"}`,
                            transition: "all 0.2s"
                          }}>
                            <input
                              type="checkbox"
                              checked={sub.status === "Completed"}
                              onChange={() => handleToggleSubtask(task, sub)}
                              style={{ width: 16, height: 16, accentColor: "var(--color-accent)", cursor: "pointer" }}
                            />
                            <span style={{
                              flex: 1, fontSize: 14,
                              textDecoration: sub.status === "Completed" ? "line-through" : "none",
                              color: sub.status === "Completed" ? "var(--color-text-muted)" : "var(--color-text)"
                            }}>
                              {sub.title}
                            </span>
                            {sub.status === "Completed" && (
                              <span style={{ fontSize: 11, color: "#15803D", fontWeight: 600 }}>Done</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}