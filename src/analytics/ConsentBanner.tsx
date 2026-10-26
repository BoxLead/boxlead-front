import { Link } from "react-router-dom";
import { useConsent } from "./consent";
import { applyConsent } from "./gtag";
import "./ConsentBanner.css";

export function ConsentBanner() {
  const consent = useConsent();
  if (consent !== null) return null;

  return (
    <section className="consent panel-elevated" aria-labelledby="consent-heading">
      <div className="consent-body">
        <h2 className="consent-heading" id="consent-heading">
          ¿Nos dejás medir las visitas?
        </h2>
        <p className="consent-text">
          Usamos Google Analytics solo si aceptás, para entender qué páginas sirven y mejorar el sitio. No vendemos tus
          datos. Podés cambiar de idea desde el pie de página. Más en la{" "}
          <Link to="/privacidad">Política de privacidad</Link>.
        </p>
      </div>
      <div className="consent-actions">
        <button type="button" className="btn btn-secondary" onClick={() => applyConsent("denied")}>
          Rechazar
        </button>
        <button type="button" className="btn btn-primary" onClick={() => applyConsent("granted")}>
          Aceptar
        </button>
      </div>
    </section>
  );
}
