import { useEffect, useState } from "react";
import api, { apiErrorMessage } from "../services/api";
import NoTeamLanding from "../components/NoTeamLanding";
import ErrorState from "../components/ErrorState";

export default function ManagerTeam() {
  const [members,     setMembers]     = useState([]);
  const [available,   setAvailable]   = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");
  const [noTeam,      setNoTeam]      = useState(false);

  // Invite modal
  const [inviteModal,   setInviteModal]   = useState(false);
  const [selectedEmp,   setSelectedEmp]   = useState("");
  const [inviting,      setInviting]      = useState(false);
  const [inviteError,   setInviteError]   = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");

  const fetchAll = async () => {
    setLoading(true);
    setError("");
    try {
      const [membersRes, availRes, invRes] = await Promise.allSettled([
        api.get("/teammanager/viewteam"),
        api.get("/teammanager/available"),
        api.get("/teammanager/invitations"),
      ]);

      const failed = [membersRes, availRes, invRes]
        .find(result => result.status === "rejected" && result.reason.response?.status !== 404);
      if (failed) setError(apiErrorMessage(failed.reason, "Failed to load team data."));
      if (membersRes.status === "rejected" && membersRes.reason.response?.status === 404) {
        setNoTeam(true);
      } else {
        setNoTeam(false);
      }

      setMembers(membersRes.status === "fulfilled"
        ? membersRes.value.data.team || [] : []);
      setAvailable(availRes.status === "fulfilled"
        ? availRes.value.data.employees || [] : []);
      setInvitations(invRes.status === "fulfilled"
        ? invRes.value.data.invitations || [] : []);
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to load team data."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(() => fetchAll());
  }, []);

  // ── Invite ─────────────────────────────────────────────
  const handleInvite = async () => {
    if (!selectedEmp) { setInviteError("Please select an employee."); return; }
    setInviting(true); setInviteError(""); setInviteSuccess("");
    try {
      await api.post("/teammanager/invitetoteam", { emp_id: parseInt(selectedEmp) });
      setInviteSuccess("Invitation sent!");
      setSelectedEmp("");
      fetchAll();
      setTimeout(() => { setInviteModal(false); setInviteSuccess(""); }, 1200);
    } catch (err) {
      setInviteError(apiErrorMessage(err, "We couldn't send the invitation. Please try again."));
    } finally {
      setInviting(false);
    }
  };

  // ── Cancel Invitation ───────────────────────────────────
  const handleCancelInvite = async (id) => {
    try {
      await api.delete(`/teammanager/invitation/${id}`);
      fetchAll();
    } catch (err) {
      setError(apiErrorMessage(err, "We couldn't cancel the invitation. Please try again."));
    }
  };

  const statusBadge = (s) => {
    if (s === "Pending")  return <span className="badge badge-blue">Pending</span>;
    if (s === "Accepted") return <span className="badge badge-green">Accepted</span>;
    return <span className="badge badge-gray">{s}</span>;
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>My Team</h1>
          <p>View members, send invitations, and manage your team.</p>
        </div>
        <button className="btn btn-accent" onClick={() => {
          setInviteError(""); setInviteSuccess(""); setSelectedEmp("");
          setInviteModal(true);
        }}>
          + Invite Employee
        </button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {loading ? (
        <div className="spinner-wrap"><div className="spinner" /></div>
      ) : noTeam ? (
        <NoTeamLanding />
      ) : error ? (
        <ErrorState title="Unable to load your team" message={error} actionLabel="Try Again" onAction={fetchAll} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

          {/* Team Members */}
          <div className="card">
            <div className="card-header">
              <h2>Team Members</h2>
              <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                {members.length} member{members.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="table-wrap">
              {members.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">👥</div>
                  <p>No team members yet. Invite employees to join.</p>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Employee ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m, i) => (
                      <tr key={m.emp_id}>
                        <td style={{ color: "var(--color-text-muted)" }}>{i + 1}</td>
                        <td><strong>{m.firstname} {m.lastname}</strong></td>
                        <td style={{ color: "var(--color-text-muted)" }}>#{m.emp_id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Invitations */}
          <div className="card">
            <div className="card-header">
              <h2>Sent Invitations</h2>
              <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                {invitations.length} invitation{invitations.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="table-wrap">
              {invitations.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📨</div>
                  <p>No invitations sent yet.</p>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Status</th>
                      <th>Sent At</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invitations.map(inv => (
                      <tr key={inv.invitation_id}>
                        <td><strong>{inv.firstname} {inv.lastname}</strong></td>
                        <td>{statusBadge(inv.status)}</td>
                        <td style={{ color: "var(--color-text-muted)", fontSize: 12 }}>
                          {new Date(inv.invited_at).toLocaleDateString()}
                        </td>
                        <td>
                          {inv.status === "Pending" && (
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleCancelInvite(inv.invitation_id)}
                            >
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Invite Modal ── */}
      {inviteModal && (
        <div className="modal-overlay" onClick={() => setInviteModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Invite Employee</h3>
              <button className="modal-close" onClick={() => setInviteModal(false)}>×</button>
            </div>
            <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 18 }}>
              Select an available employee to invite to your team.
            </p>
            {inviteError   && <div className="error-msg">{inviteError}</div>}
            {inviteSuccess && (
              <div style={{
                background: "#F0FDF4", border: "1px solid #BBF7D0", color: "#15803D",
                borderRadius: "var(--radius-sm)", padding: "10px 14px", fontSize: 13, marginBottom: 14
              }}>{inviteSuccess}</div>
            )}
            <div className="modal-form">
              <div className="form-group">
                <label>Select Employee</label>
                {available.length === 0 ? (
                  <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                    No available employees at the moment.
                  </p>
                ) : (
                  <select value={selectedEmp} onChange={e => setSelectedEmp(e.target.value)}>
                    <option value="">— Choose an employee —</option>
                    {available.map(e => (
                      <option key={e.emp_id} value={e.emp_id}>
                        {e.firstname} {e.lastname}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setInviteModal(false)}>Cancel</button>
              <button
                className="btn btn-accent"
                onClick={handleInvite}
                disabled={inviting || available.length === 0}
              >
                {inviting ? "Sending…" : "Send Invitation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}