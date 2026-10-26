import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { AlertIcon } from "../components/icons/UiIcons";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { isChunkLoadError } from "./chunkRetry";
import "./RouteError.css";

type RouteErrorProps = {
  error: unknown;
  inline?: boolean;
  onRetry: () => void;
};

export function RouteError({ error, inline = false, onRetry }: RouteErrorProps) {
  const chunk = isChunkLoadError(error);
  const title = chunk ? "Hay una versión nueva de BoxLead" : "Esta pantalla no se pudo mostrar";
  const heading = useRef<HTMLHeadingElement>(null);
  useDocumentTitle(title);

  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className={`route-error${inline ? " route-error-inline" : ""}`} role="alert">
      <span className="route-error-icon">
        <AlertIcon />
      </span>
      <h1 className="route-error-title" tabIndex={-1} ref={heading}>
        {title}
      </h1>
      <p className="route-error-hint">
        {chunk
          ? "Recargá la página para seguir con la versión actual."
          : "Probá de nuevo. Si vuelve a pasar, escribinos a soporte y contanos qué estabas haciendo."}
      </p>
      <div className="route-error-actions">
        {chunk ? (
          <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
            Recargar
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={onRetry}>
            Reintentar
          </button>
        )}
        <Link to={inline ? "/app/inbox" : "/"} className="btn btn-secondary" onClick={onRetry}>
          {inline ? "Ir a la bandeja" : "Ir al inicio"}
        </Link>
      </div>
    </div>
  );
}
