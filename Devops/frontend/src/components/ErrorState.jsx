export default function ErrorState({
  title = "Unable to complete request",
  message = "We couldn't complete this request. Please try again.",
  actionLabel,
  onAction,
}) {
  return (
    <div className="state-card" role="alert">
      <div className="state-card-icon">!</div>
      <h2>{title}</h2>
      <p>{message}</p>
      {actionLabel && onAction && (
        <button className="btn btn-accent" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
