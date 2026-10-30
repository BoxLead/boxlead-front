export function LoadingIndicator({ inline = false, label }: { inline?: boolean; label: string }) {
  return (
    <div
      className={`app-loading${inline ? " app-loading-inline" : ""}`}
      role="status"
    >
      <span className="spinner" />
      <span className="visually-hidden">{label}</span>
    </div>
  );
}
