import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { apiErrorMessage } from "../services/api";
import ErrorState from "../components/ErrorState";

export default function Overview() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadTeams = () => {
    setLoading(true);
    setError("");
    Promise.allSettled([api.get("/getteams")])
      .then(([result]) => {
        if (result.status === "rejected") {
          setError(apiErrorMessage(result.reason, "Failed to load teams."));
          return;
        }
        if (!Array.isArray(result.value.data.Teams)) {
          setError("The teams response was unexpected.");
          return;
        }
        setTeams(result.value.data.Teams);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void Promise.resolve().then(loadTeams);
  }, []);

  const totalTeams    = teams.length;
  const assignedMgrs  = teams.filter(t => t.manager_id).length;
  const unassigned    = totalTeams - assignedMgrs;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Overview</h1>
          <p>Welcome back, Admin. Here's what's happening today.</p>
        </div>
        <button className="btn btn-accent" onClick={() => navigate("/admin/teams/create")}>
          + Create Team
        </button>
      </div>

      {/* Stat cards */}
      <div className="stats-grid">
        <div className="card stat-card stat-accent">
          <div className="stat-label">Total Teams</div>
          <div className="stat-value">{loading ? "—" : totalTeams}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Managed Teams</div>
          <div className="stat-value">{loading ? "—" : assignedMgrs}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Unassigned Teams</div>
          <div className="stat-value">{loading ? "—" : unassigned}</div>
        </div>
      </div>

      {error && teams.length > 0 && <div className="error-msg">{error}</div>}

      {/* Recent teams */}
      <div className="card">
        <div className="card-header">
          <h2>Recent Teams</h2>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate("/admin/teams")}>
            View all →
          </button>
        </div>
        <div className="table-wrap">
          {loading ? (
            <div className="spinner-wrap"><div className="spinner" /></div>
          ) : error ? (
            <ErrorState title="Unable to load teams" message={error} actionLabel="Try Again" onAction={loadTeams} />
          ) : teams.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">◫</div>
              <p>No teams yet. Create your first team to get started.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Team Name</th>
                  <th>Manager</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {teams.slice(0, 5).map(team => (
                  <tr key={team.team_id}>
                    <td><strong>{team.team_name}</strong></td>
                    <td>{team.firstname ? `${team.firstname} ${team.lastname}` : <span style={{color:"var(--color-text-muted)"}}>—</span>}</td>
                    <td>
                      {team.manager_id
                        ? <span className="badge badge-green">Managed</span>
                        : <span className="badge badge-gray">Unassigned</span>}
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