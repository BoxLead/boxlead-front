import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { EmptyIllustration } from "../components/EmptyState/EmptyIllustration";
import "./NotFound.css";

export function NotFound({ inApp = false }: { inApp?: boolean }) {
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className={`not-found${inApp ? " not-found-inline" : ""}`}>
      <span className="not-found-code" aria-hidden="true">
        404
      </span>
      <span className="not-found-art">
        <EmptyIllustration kind="missing" />
      </span>
      <h1 className="not-found-title" tabIndex={-1} ref={heading}>
        No encontramos esta página
      </h1>
      <p className="not-found-hint">
        {inApp
          ? "El enlace puede estar mal escrito o la sección ya no existe."
          : "El enlace puede estar mal escrito o la página ya no existe."}
      </p>
      <div className="not-found-actions">
        {inApp ? (
          <>
            <Link to="/app/inbox" className="btn btn-primary">
              Ir a la bandeja
            </Link>
            <Link to="/app/leads" className="btn btn-secondary">
              Ver leads
            </Link>
          </>
        ) : (
          <>
            <Link to="/" className="btn btn-primary">
              Ir al inicio
            </Link>
            <Link to="/login" className="btn btn-secondary">
              Iniciar sesión
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
