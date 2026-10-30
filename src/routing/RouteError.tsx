import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const chunk = isChunkLoadError(error);
  const title = chunk ? t("routeError.chunkTitle") : t("routeError.title");
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
        {chunk ? t("routeError.chunkHint") : t("routeError.hint")}
      </p>
      <div className="route-error-actions">
        {chunk ? (
          <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
            {t("routeError.reload")}
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={onRetry}>
            {t("routeError.retry")}
          </button>
        )}
        <Link to={inline ? "/app/inbox" : "/"} className="btn btn-secondary" onClick={onRetry}>
          {inline ? t("notFound.inbox", { ns: "common" }) : t("notFound.home", { ns: "common" })}
        </Link>
      </div>
    </div>
  );
}
