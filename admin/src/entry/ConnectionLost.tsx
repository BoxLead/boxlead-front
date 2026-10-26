import { Banner } from "../../../src/components/ui/Banner";
import { useSession } from "../session/session";
import "./ConnectionLost.css";

export function ConnectionLost() {
  const { connectionLost } = useSession();
  if (!connectionLost) return null;
  return (
    <div className="connection-lost">
      <Banner
        tone="danger"
        title="Se cortó la conexión con BoxLead"
        action={
          <button type="button" className="btn btn-primary btn-sm" onClick={() => window.location.reload()}>
            Recargar
          </button>
        }
      >
        Puede que tu acceso haya vencido. Recargá la página para volver a entrar.
      </Banner>
    </div>
  );
}
