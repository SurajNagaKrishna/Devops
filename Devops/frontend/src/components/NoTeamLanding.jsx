export default function NoTeamLanding() {
  return (
    <div className="state-card no-team-state">
      <div className="state-card-icon">◫</div>
      <span className="state-card-status">Waiting for team assignment</span>
      <h1>Your team hasn't been assigned yet</h1>
      <p>
        Your account is ready. An administrator needs to assign a team to you
        before your manager dashboard becomes available.
      </p>
      <div className="no-team-benefits">
        <span>Team members</span>
        <span>Tasks</span>
        <span>Team analytics</span>
        <span>Performance overview</span>
      </div>
    </div>
  );
}
