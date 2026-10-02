export function Loading({ inline = false }: { inline?: boolean }) {
  return (
    <div
      className={`app-loading${inline ? " app-loading-inline" : ""}`}
      role="status"
    >
      <span className="spinner" />
      <span className="visually-hidden">Cargando…</span>
    </div>
  );
}
