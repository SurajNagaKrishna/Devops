import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { apiErrorMessage } from "../services/api";

export default function Teams() {
  const navigate = useNavigate();

  const [teams, setTeams]       = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");

  // Change manager modal
  const [changeModal, setChangeModal]     = useState(false);
  const [selectedTeam, setSelectedTeam]   = useState(null);
  const [newManagerId, setNewManagerId]   = useState("");
  const [changingMgr, setChangingMgr]     = useState(false);
  const [changeError, setChangeError]     = useState("");

  // Delete confirm modal
  const [deleteModal, setDeleteModal]     = useState(false);
  const [teamToDelete, setTeamToDelete]   = useState(null);
  const [deleting, setDeleting]           = useState(false);
  const [deleteError, setDeleteError]     = useState("");

  const fetchAll = async () => {
    setLoading(true);
    setError("");
    try {
      const [teamsRes, mgrsRes] = await Promise.all([
        api.get("/getteams"),
        api.get("/getteams/AvailableManagers"),
      ]);
      if (!Array.isArray(teamsRes.data.Teams) || !Array.isArray(mgrsRes.data.Managers)) {
        throw new Error("Malformed teams response");
      }
      setTeams(teamsRes.data.Teams);
      setManagers(mgrsRes.data.Managers);
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to load teams."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(() => fetchAll());
  }, []);

  // ── Change Manager ─────────────────────────────────────
  const openChangeModal = (team) => {
    setSelectedTeam(team);
    setNewManagerId("");
    setChangeError("");
    setChangeModal(true);
  };

  const handleChangeManager = async () => {
    if (!newManagerId) { setChangeError("Please select a manager."); return; }
    setChangingMgr(true);
    setChangeError("");
    try {
      await api.put(`/getteams/teams/${selectedTeam.team_id}/manager`, {
        manager_id: parseInt(newManagerId),
      });
      setChangeModal(false);
      fetchAll();
    } catch (err) {
      setChangeError(apiErrorMessage(err, "We couldn't update the team manager. Please try again."));
    } finally {
      setChangingMgr(false);
    }
  };

  // ── Delete Team ────────────────────────────────────────
  const openDeleteModal = (team) => {
    setTeamToDelete(team);
    setDeleteError("");
    setDeleteModal(true);
  };

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError("");
    try {
      await api.delete(`/getteams/teams/${teamToDelete.team_id}`);
      setDeleteModal(false);
      fetchAll();
    } catch (err) {
      setDeleteError(apiErrorMessage(err, "We couldn't delete the team. Please try again."));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1>Teams</h1>
          <p>Manage all teams and their assigned managers.</p>
        </div>
        <button className="btn btn-accent" onClick={() => navigate("/admin/teams/create")}>
          + Create Team
        </button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {/* Table card */}
      <div className="card">
        <div className="card-header">
          <h2>All Teams</h2>
          <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
            {teams.length} team{teams.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="table-wrap">
          {loading ? (
            <div className="spinner-wrap"><div className="spinner" /></div>
          ) : teams.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">◫</div>
              <p>No teams found. Create one to get started.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Team Name</th>
                  <th>Manager</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((team, i) => (
                  <tr key={team.team_id}>
                    <td style={{ color: "var(--color-text-muted)" }}>{i + 1}</td>
                    <td><strong>{team.team_name}</strong></td>
                    <td>{team.firstname ? `${team.firstname} ${team.lastname}` : <span style={{ color: "var(--color-text-muted)" }}>—</span>}</td>
                    <td>
                      {team.manager_id
                        ? <span className="badge badge-green">Managed</span>
                        : <span className="badge badge-gray">Unassigned</span>}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => openChangeModal(team)}
                        >
                          ✎ Manager
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => openDeleteModal(team)}
                        >
                          ✕ Delete
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

      {/* ── Change Manager Modal ── */}
      {changeModal && (
        <div className="modal-overlay" onClick={() => setChangeModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Change Manager</h3>
              <button className="modal-close" onClick={() => setChangeModal(false)}>×</button>
            </div>
            <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 18 }}>
              Assigning a new manager to <strong>{selectedTeam?.team_name}</strong>
            </p>
            {changeError && <div className="error-msg">{changeError}</div>}
            <div className="modal-form">
              <div className="form-group">
                <label>Select Manager</label>
                <select value={newManagerId} onChange={e => setNewManagerId(e.target.value)}>
                  <option value="">— Choose a manager —</option>
                  {managers.map(m => (
                    <option key={m.emp_id} value={m.emp_id}>
                      {m.firstname} {m.lastname} — {m.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setChangeModal(false)}>Cancel</button>
              <button className="btn btn-accent" onClick={handleChangeManager} disabled={changingMgr}>
                {changingMgr ? "Saving…" : "Save changes"}
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
              <h3>Delete Team</h3>
              <button className="modal-close" onClick={() => setDeleteModal(false)}>×</button>
            </div>
            <p style={{ fontSize: 14, marginBottom: 18 }}>
              Are you sure you want to delete <strong>{teamToDelete?.team_name}</strong>? This action cannot be undone.
            </p>
            {deleteError && <div className="error-msg">{deleteError}</div>}
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setDeleteModal(false)}>Cancel</button>
              <button
                className="btn btn-danger"
                style={{ background: "var(--color-danger)", color: "#fff", border: "none" }}
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Yes, delete team"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}