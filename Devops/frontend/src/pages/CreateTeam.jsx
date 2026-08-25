import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { apiErrorMessage } from "../services/api";

export default function CreateTeam() {
  const navigate = useNavigate();

  const [teamName, setTeamName]   = useState("");
  const [managerId, setManagerId] = useState("");
  const [managers, setManagers]   = useState([]);
  const [loading, setLoading]     = useState(false);
  const [fetching, setFetching]   = useState(true);
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState("");

  useEffect(() => {
    api.get("/getteams/AvailableManagers")
      .then(({ data }) => {
        const mgrs = data.Managers || [];
        setManagers(mgrs);
        // Auto-select first manager if available
        if (mgrs.length > 0) setManagerId(String(mgrs[0].emp_id));
      })
      .catch(err => setError(apiErrorMessage(err, "We couldn't load available managers. Please try again.")))
      .finally(() => setFetching(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");

    if (!teamName.trim()) { setError("Team name is required."); return; }
    if (!managerId)       { setError("Please select a manager."); return; }

    setLoading(true);
    try {
      await api.post("/getteams/createTeam", {
        team_name:  teamName.trim(),
        manager_id: parseInt(managerId),
      });
      setSuccess("Team created successfully!");
      setTimeout(() => navigate("/admin/teams"), 1200);
    } catch (err) {
      setError(apiErrorMessage(err, "We couldn't create the team right now. Please try again later."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Create Team</h1>
          <p>Add a new team and assign a manager.</p>
        </div>
        <button className="btn btn-ghost" onClick={() => navigate("/admin/teams")}>
          ← Back to Teams
        </button>
      </div>

      <div className="card" style={{ maxWidth: 520 }}>
        <div className="card-header">
          <h2>Team Details</h2>
        </div>
        <div style={{ padding: "24px 22px" }}>
          {error && <div className="error-msg">{error}</div>}
          {success && (
            <div style={{
              background: "#F0FDF4", border: "1px solid #BBF7D0",
              color: "#15803D", borderRadius: "var(--radius-sm)",
              padding: "10px 14px", fontSize: 13, marginBottom: 16
            }}>
              {success}
            </div>
          )}

          <form className="modal-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Team Name <span style={{ color: "var(--color-danger)" }}>*</span></label>
              <input
                type="text"
                placeholder="e.g. Engineering, Design…"
                value={teamName}
                onChange={e => setTeamName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Manager <span style={{ color: "var(--color-danger)" }}>*</span></label>
              {fetching ? (
                <div style={{ color: "var(--color-text-muted)", fontSize: 13 }}>Loading managers…</div>
              ) : managers.length === 0 ? (
                <div className="error-msg">
                  No available managers. Please register a Team Manager first.
                </div>
              ) : (
                <select value={managerId} onChange={e => setManagerId(e.target.value)}>
                  <option value="">— Select a manager —</option>
                  {managers.map(m => (
                    <option key={m.emp_id} value={m.emp_id}>
                      {m.firstname} {m.lastname} — {m.email}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 22, justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => navigate("/admin/teams")}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-accent"
                disabled={loading || fetching || managers.length === 0}
              >
                {loading ? "Creating…" : "Create Team"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}