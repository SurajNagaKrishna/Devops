import { useEffect, useState } from "react";
import api, { apiErrorMessage } from "../services/api";
import NoTeamLanding from "../components/NoTeamLanding";
import ErrorState from "../components/ErrorState";

const PRIORITIES = ["Low", "Medium", "High"];
const STATUSES   = ["Pending", "In Progress", "Completed"];

// Defined outside component to prevent remount on every keystroke
function FormField({ label, children, required }) {
  return (
    <div className="form-group">
      <label>{label}{required && <span style={{ color: "var(--color-danger)" }}> *</span>}</label>
      {children}
    </div>
  );
}

const emptyTask = {
  assigned_to: "", title: "", description: "", priority: "Medium", deadline: ""
};

export default function ManagerTasks() {
  const [tasks,    setTasks]    = useState([]);
  const [members,  setMembers]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [noTeam,   setNoTeam]   = useState(false);

  // Create task modal
  const [createModal,   setCreateModal]   = useState(false);
  const [taskForm,      setTaskForm]      = useState(emptyTask);
  const [creating,      setCreating]      = useState(false);
  const [createError,   setCreateError]   = useState("");

  // Edit task modal
  const [editModal,     setEditModal]     = useState(false);
  const [editTask,      setEditTask]      = useState(null);
  const [editForm,      setEditForm]      = useState({});
  const [saving,        setSaving]        = useState(false);
  const [editError,     setEditError]     = useState("");

  // Subtask modal
  const [subtaskModal,  setSubtaskModal]  = useState(false);
  const [subtaskTask,   setSubtaskTask]   = useState(null);
  const [newSubtask,    setNewSubtask]    = useState("");
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [subtaskError,  setSubtaskError]  = useState("");

  // Delete confirm
  const [deleteModal,   setDeleteModal]   = useState(false);
  const [taskToDelete,  setTaskToDelete]  = useState(null);
  const [deleting,      setDeleting]      = useState(false);

  const fetchAll = async () => {
    setLoading(true); setError("");
    try {
      const [tasksRes, membersRes] = await Promise.allSettled([
        api.get("/teammanager/tasksdashboard"),
        api.get("/teammanager/viewteam"),
      ]);

      if (tasksRes.status === "rejected") {
        setError(apiErrorMessage(tasksRes.reason, "Failed to load tasks."));
      }
      if (membersRes.status === "rejected" && membersRes.reason.response?.status !== 404) {
        setError(apiErrorMessage(membersRes.reason, "Failed to load team members."));
      }
      setNoTeam(membersRes.status === "rejected" && membersRes.reason.response?.status === 404);

      const rawTasks = tasksRes.status === "fulfilled"
        ? tasksRes.value.data.tasks || [] : [];
      if (tasksRes.status === "fulfilled" && !Array.isArray(rawTasks)) {
        setError("The task dashboard returned an unexpected response.");
      }

      // Group tasks with their subtasks
      const grouped = {};
      rawTasks.forEach(row => {
        if (!grouped[row.task_id]) {
          grouped[row.task_id] = {
            task_id: row.task_id, title: row.title, description: row.description,
            priority: row.priority, status: row.status, deadline: row.deadline,
            emp_id: row.emp_id, firstname: row.firstname, lastname: row.lastname,
            subtasks: []
          };
        }
        if (row.subtask_id) {
          grouped[row.task_id].subtasks.push({
            subtask_id: row.subtask_id,
            title: row.subtask_title,
            status: row.subtask_status
          });
        }
      });
      setTasks(Object.values(grouped));
      setMembers(membersRes.status === "fulfilled"
        ? membersRes.value.data.team || [] : []);
    } catch {
      setError("Failed to load tasks.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(() => fetchAll());
  }, []);

  // ── Create Task ────────────────────────────────────────
  const handleCreate = async () => {
    if (!taskForm.title.trim())    { setCreateError("Title is required."); return; }
    if (!taskForm.assigned_to)     { setCreateError("Please select a member."); return; }
    setCreating(true); setCreateError("");
    try {
      await api.post("/teammanager/createtasks", {
        ...taskForm,
        assigned_to: parseInt(taskForm.assigned_to),
      });
      setCreateModal(false);
      setTaskForm(emptyTask);
      fetchAll();
    } catch (err) {
      setCreateError(apiErrorMessage(err, "We couldn't create the task. Please try again."));
    } finally {
      setCreating(false);
    }
  };

  // ── Edit Task ──────────────────────────────────────────
  const openEdit = (task) => {
    setEditTask(task);
    setEditForm({
      assigned_to:  String(task.emp_id),
      title:        task.title,
      description:  task.description || "",
      priority:     task.priority,
      deadline:     task.deadline ? task.deadline.split("T")[0] : "",
      status:       task.status,
    });
    setEditError("");
    setEditModal(true);
  };

  const handleEdit = async () => {
    if (!editForm.title.trim()) { setEditError("Title is required."); return; }
    setSaving(true); setEditError("");
    try {
      await api.put(`/teammanager/task/${editTask.task_id}`, {
        ...editForm,
        assigned_to: parseInt(editForm.assigned_to),
      });
      setEditModal(false);
      fetchAll();
    } catch (err) {
      setEditError(apiErrorMessage(err, "We couldn't update the task. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  // ── Delete Task ────────────────────────────────────────
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/teammanager/task/${taskToDelete.task_id}`);
      setDeleteModal(false);
      fetchAll();
    } catch (err) {
      setError(apiErrorMessage(err, "We couldn't delete the task. Please try again."));
    } finally {
      setDeleting(false);
    }
  };

  // ── Subtasks ───────────────────────────────────────────
  const openSubtasks = (task) => {
    setSubtaskTask(task);
    setNewSubtask("");
    setSubtaskError("");
    setSubtaskModal(true);
  };

  const handleAddSubtask = async () => {
    if (!newSubtask.trim()) { setSubtaskError("Subtask title is required."); return; }
    setAddingSubtask(true); setSubtaskError("");
    try {
      await api.post(`/teammanager/addsubtask/${subtaskTask.task_id}`, { title: newSubtask.trim() });
      setNewSubtask("");
      fetchAll();
      // refresh subtask list in modal
      const res = await api.get("/teammanager/tasksdashboard");
      const raw = res.data.tasks || [];
      const found = raw.filter(r => r.task_id === subtaskTask.task_id);
      const subs = found.filter(r => r.subtask_id).map(r => ({
        subtask_id: r.subtask_id, title: r.subtask_title, status: r.subtask_status
      }));
      setSubtaskTask(prev => ({ ...prev, subtasks: subs }));
    } catch (err) {
      setSubtaskError(apiErrorMessage(err, "We couldn't add the subtask. Please try again."));
    } finally {
      setAddingSubtask(false);
    }
  };

  const handleToggleSubtask = async (sub) => {
    const newStatus = sub.status === "Completed" ? "Pending" : "Completed";
    try {
      await api.put(`/teammanager/subtask/${sub.subtask_id}`, {
        title: sub.title, status: newStatus
      });
      fetchAll();
      setSubtaskTask(prev => ({
        ...prev,
        subtasks: prev.subtasks.map(s =>
          s.subtask_id === sub.subtask_id ? { ...s, status: newStatus } : s
        )
      }));
    } catch (err) {
      setSubtaskError(apiErrorMessage(err, "We couldn't update the subtask. Please try again."));
    }
  };

  const handleDeleteSubtask = async (sub) => {
    try {
      await api.delete(`/teammanager/subtask/${sub.subtask_id}`);
      fetchAll();
      setSubtaskTask(prev => ({
        ...prev,
        subtasks: prev.subtasks.filter(s => s.subtask_id !== sub.subtask_id)
      }));
    } catch (err) {
      setSubtaskError(apiErrorMessage(err, "We couldn't delete the subtask. Please try again."));
    }
  };

  // ── Helpers ────────────────────────────────────────────
  const priorityBadge = (p) => {
    if (p === "High")   return <span className="badge" style={{ background:"#FEE2E2", color:"#DC2626" }}>High</span>;
    if (p === "Medium") return <span className="badge badge-blue">Medium</span>;
    return <span className="badge badge-gray">Low</span>;
  };

  const statusBadge = (s) => {
    if (s === "Completed")  return <span className="badge badge-green">Completed</span>;
    if (s === "In Progress") return <span className="badge badge-blue">In Progress</span>;
    return <span className="badge badge-gray">Pending</span>;
  };


  return (
    <>
      <div className="page-header">
        <div>
          <h1>Tasks</h1>
          <p>Create, assign, and manage tasks for your team.</p>
        </div>
        <button className="btn btn-accent" onClick={() => {
          setTaskForm(emptyTask); setCreateError(""); setCreateModal(true);
        }}>
          + Create Task
        </button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div className="card">
        <div className="card-header">
          <h2>All Tasks</h2>
          <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
            {tasks.length} task{tasks.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="table-wrap">
          {loading ? (
            <div className="spinner-wrap"><div className="spinner" /></div>
          ) : noTeam ? (
            <NoTeamLanding />
          ) : error ? (
            <ErrorState title="Unable to load your tasks" message={error} actionLabel="Try Again" onAction={fetchAll} />
          ) : tasks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">✓</div>
              <p>No tasks yet. Create one to get started.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Assigned To</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Deadline</th>
                  <th>Subtasks</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(task => (
                  <tr key={task.task_id}>
                    <td><strong>{task.title}</strong></td>
                    <td>{task.firstname} {task.lastname}</td>
                    <td>{priorityBadge(task.priority)}</td>
                    <td>{statusBadge(task.status)}</td>
                    <td style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                      {task.deadline ? new Date(task.deadline).toLocaleDateString() : "—"}
                    </td>
                    <td style={{ minWidth: 140 }}>
                      {task.subtasks.length === 0 ? (
                        <button className="btn btn-ghost btn-sm" onClick={() => openSubtasks(task)}>
                          + Add Subtasks
                        </button>
                      ) : (() => {
                        const done  = task.subtasks.filter(s => s.status === "Completed").length;
                        const total = task.subtasks.length;
                        const pct   = Math.round((done / total) * 100);
                        const allDone = done === total;
                        return (
                          <div style={{ cursor: "pointer" }} onClick={() => openSubtasks(task)}>
                            <div style={{
                              display: "flex", justifyContent: "space-between",
                              fontSize: 11, color: allDone ? "#15803D" : "var(--color-text-muted)",
                              marginBottom: 4, fontWeight: 600
                            }}>
                              <span>{done}/{total} done</span>
                              <span>{pct}%</span>
                            </div>
                            <div style={{
                              height: 5, background: "var(--color-border)",
                              borderRadius: 99, overflow: "hidden"
                            }}>
                              <div style={{
                                height: "100%", borderRadius: 99,
                                background: allDone ? "#22C55E" : "var(--color-accent)",
                                width: `${pct}%`,
                                transition: "width 0.3s ease"
                              }} />
                            </div>
                          </div>
                        );
                      })()}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(task)}>
                          ✎ Edit
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => {
                          setTaskToDelete(task); setDeleteModal(true);
                        }}>
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Create Task Modal ── */}
      {createModal && (
        <div className="modal-overlay" onClick={() => setCreateModal(false)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Task</h3>
              <button className="modal-close" onClick={() => setCreateModal(false)}>×</button>
            </div>
            {createError && <div className="error-msg">{createError}</div>}
            <div className="modal-form">
              <FormField label="Title" required>
                <input placeholder="Task title" value={taskForm.title}
                  onChange={e => setTaskForm(p => ({ ...p, title: e.target.value }))} />
              </FormField>
              <FormField label="Assign To" required>
                <select value={taskForm.assigned_to}
                  onChange={e => setTaskForm(p => ({ ...p, assigned_to: e.target.value }))}>
                  <option value="">— Select member —</option>
                  {members.map(m => (
                    <option key={m.emp_id} value={m.emp_id}>{m.firstname} {m.lastname}</option>
                  ))}
                </select>
              </FormField>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <FormField label="Priority">
                  <select value={taskForm.priority}
                    onChange={e => setTaskForm(p => ({ ...p, priority: e.target.value }))}>
                    {PRIORITIES.map(p => <option key={p}>{p}</option>)}
                  </select>
                </FormField>
                <FormField label="Deadline">
                  <input type="date" value={taskForm.deadline}
                    onChange={e => setTaskForm(p => ({ ...p, deadline: e.target.value }))} />
                </FormField>
              </div>
              <FormField label="Description">
                <textarea
                  placeholder="Optional description…"
                  value={taskForm.description}
                  onChange={e => setTaskForm(p => ({ ...p, description: e.target.value }))}
                  style={{
                    width: "100%", padding: "9px 13px", border: "1.5px solid var(--color-border)",
                    borderRadius: "var(--radius-sm)", fontSize: 14, background: "var(--color-bg)",
                    fontFamily: "var(--font)", resize: "vertical", minHeight: 80, outline: "none"
                  }}
                />
              </FormField>
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setCreateModal(false)}>Cancel</button>
              <button className="btn btn-accent" onClick={handleCreate} disabled={creating}>
                {creating ? "Creating…" : "Create Task"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Task Modal ── */}
      {editModal && (
        <div className="modal-overlay" onClick={() => setEditModal(false)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Task</h3>
              <button className="modal-close" onClick={() => setEditModal(false)}>×</button>
            </div>
            {editError && <div className="error-msg">{editError}</div>}
            <div className="modal-form">
              <FormField label="Title" required>
                <input value={editForm.title}
                  onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} />
              </FormField>
              <FormField label="Assign To" required>
                <select value={editForm.assigned_to}
                  onChange={e => setEditForm(p => ({ ...p, assigned_to: e.target.value }))}>
                  {members.map(m => (
                    <option key={m.emp_id} value={m.emp_id}>{m.firstname} {m.lastname}</option>
                  ))}
                </select>
              </FormField>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <FormField label="Priority">
                  <select value={editForm.priority}
                    onChange={e => setEditForm(p => ({ ...p, priority: e.target.value }))}>
                    {PRIORITIES.map(p => <option key={p}>{p}</option>)}
                  </select>
                </FormField>
                <FormField label="Status">
                  <select value={editForm.status}
                    onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}>
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </FormField>
                <FormField label="Deadline">
                  <input type="date" value={editForm.deadline}
                    onChange={e => setEditForm(p => ({ ...p, deadline: e.target.value }))} />
                </FormField>
              </div>
              <FormField label="Description">
                <textarea value={editForm.description}
                  onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
                  style={{
                    width: "100%", padding: "9px 13px", border: "1.5px solid var(--color-border)",
                    borderRadius: "var(--radius-sm)", fontSize: 14, background: "var(--color-bg)",
                    fontFamily: "var(--font)", resize: "vertical", minHeight: 80, outline: "none"
                  }}
                />
              </FormField>
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setEditModal(false)}>Cancel</button>
              <button className="btn btn-accent" onClick={handleEdit} disabled={saving}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Subtasks Modal ── */}
      {subtaskModal && subtaskTask && (
        <div className="modal-overlay" onClick={() => setSubtaskModal(false)}>
          <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Subtasks — {subtaskTask.title}</h3>
              <button className="modal-close" onClick={() => setSubtaskModal(false)}>×</button>
            </div>

            {/* Existing subtasks */}
            <div style={{ marginBottom: 20 }}>
              {subtaskTask.subtasks.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--color-text-muted)", textAlign: "center", padding: "16px 0" }}>
                  No subtasks yet.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {subtaskTask.subtasks.map(sub => (
                    <div key={sub.subtask_id} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 14px", background: "var(--color-bg)",
                      borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border)"
                    }}>
                      <input
                        type="checkbox"
                        checked={sub.status === "Completed"}
                        onChange={() => handleToggleSubtask(sub)}
                        style={{ width: 16, height: 16, accentColor: "var(--color-accent)", cursor: "pointer" }}
                      />
                      <span style={{
                        flex: 1, fontSize: 14,
                        textDecoration: sub.status === "Completed" ? "line-through" : "none",
                        color: sub.status === "Completed" ? "var(--color-text-muted)" : "var(--color-text)"
                      }}>
                        {sub.title}
                      </span>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDeleteSubtask(sub)}
                        style={{ padding: "3px 8px" }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add subtask */}
            {subtaskError && <div className="error-msg">{subtaskError}</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <input
                placeholder="New subtask title…"
                value={newSubtask}
                onChange={e => setNewSubtask(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAddSubtask()}
                style={{
                  flex: 1, padding: "9px 13px", border: "1.5px solid var(--color-border)",
                  borderRadius: "var(--radius-sm)", fontSize: 14, background: "var(--color-bg)",
                  fontFamily: "var(--font)", outline: "none"
                }}
              />
              <button className="btn btn-accent" onClick={handleAddSubtask} disabled={addingSubtask}>
                {addingSubtask ? "…" : "+ Add"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteModal && (
        <div className="modal-overlay" onClick={() => setDeleteModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete Task</h3>
              <button className="modal-close" onClick={() => setDeleteModal(false)}>×</button>
            </div>
            <p style={{ fontSize: 14, marginBottom: 18 }}>
              Are you sure you want to delete <strong>{taskToDelete?.title}</strong>?
              All subtasks will also be deleted.
            </p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setDeleteModal(false)}>Cancel</button>
              <button
                className="btn btn-danger"
                style={{ background: "var(--color-danger)", color: "#fff", border: "none" }}
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Yes, delete task"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}