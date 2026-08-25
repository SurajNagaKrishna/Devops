import { useEffect, useState } from "react";
import api, { apiErrorMessage } from "../services/api";
import ErrorState from "../components/ErrorState";

export default function EmployeeInvitations() {
  const [invitations, setInvitations] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");
  const [success,     setSuccess]     = useState("");
  const [processing,  setProcessing]  = useState(null);

  const fetchInvitations = async () => {
    setLoading(true); setError("");
    try {
      const { data } = await api.get("/employee/invitations");
      if (!Array.isArray(data.invitations)) throw new Error("Malformed invitations response");
      setInvitations(data.invitations);
    } catch (err) {
      if (err.response?.status === 404) setInvitations([]);
      else setError(apiErrorMessage(err, "Failed to load invitations."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(() => fetchInvitations());
  }, []);

  const handleAccept = async (id) => {
    setProcessing(id); setError(""); setSuccess("");
    try {
      await api.put(`/employee/accept/${id}`);
      setSuccess("Invitation accepted! You've joined the team.");
      fetchInvitations();
    } catch (err) {
      setError(apiErrorMessage(err, "We couldn't accept the invitation. Please try again."));
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id) => {
    setProcessing(id); setError(""); setSuccess("");
    try {
      await api.put(`/employee/reject/${id}`);
      setSuccess("Invitation rejected.");
      fetchInvitations();
    } catch (err) {
      setError(apiErrorMessage(err, "We couldn't reject the invitation. Please try again."));
    } finally {
      setProcessing(null);
    }
  };

  const statusBadge = (s) => {
    if (s === "Accepted") return <span className="badge badge-green">Accepted</span>;
    if (s === "Rejected") return <span className="badge badge-gray">Rejected</span>;
    return <span className="badge badge-blue">Pending</span>;
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Invitations</h1>
          <p>Team invitations sent to you by managers.</p>
        </div>
      </div>

      {error   && <div className="error-msg">{error}</div>}
      {success && (
        <div style={{
          background: "#F0FDF4", border: "1px solid #BBF7D0", color: "#15803D",
          borderRadius: "var(--radius-sm)", padding: "10px 14px",
          fontSize: 13, marginBottom: 16
        }}>{success}</div>
      )}

      <div className="card">
        <div className="card-header">
          <h2>All Invitations</h2>
          <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
            {invitations.length} invitation{invitations.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="table-wrap">
          {loading ? (
            <div className="spinner-wrap"><div className="spinner" /></div>
          ) : error ? (
            <ErrorState title="Unable to load invitations" message={error} actionLabel="Try Again" onAction={fetchInvitations} />
          ) : invitations.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">✉</div>
              <p>No invitations yet.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Team</th>
                  <th>Manager</th>
                  <th>Status</th>
                  <th>Received</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invitations.map(inv => (
                  <tr key={inv.invitation_id}>
                    <td><strong>{inv.team_name}</strong></td>
                    <td>{inv.manager_firstname} {inv.manager_lastname}</td>
                    <td>{statusBadge(inv.status)}</td>
                    <td style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                      {new Date(inv.invited_at).toLocaleDateString()}
                    </td>
                    <td>
                      {inv.status === "Pending" && (
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            className="btn btn-accent btn-sm"
                            onClick={() => handleAccept(inv.invitation_id)}
                            disabled={processing === inv.invitation_id}
                          >
                            {processing === inv.invitation_id ? "…" : "✓ Accept"}
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleReject(inv.invitation_id)}
                            disabled={processing === inv.invitation_id}
                          >
                            ✕ Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}