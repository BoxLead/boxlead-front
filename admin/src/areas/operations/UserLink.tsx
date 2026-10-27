import { Link } from "react-router-dom";

export function UserLink({ id, full = false }: { id: string; full?: boolean }) {
  return (
    <Link className="entity-link mono-text" to={`/usuarios/${encodeURIComponent(id)}`} title={full ? undefined : id}>
      {full ? id : id.slice(0, 8)}
    </Link>
  );
}
