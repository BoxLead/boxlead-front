import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { EmptyIllustration } from "../components/EmptyState/EmptyIllustration";
import { useLocalizedPath } from "../i18n/useLanguage";
import "./NotFound.css";

export function NotFound({ inApp = false }: { inApp?: boolean }) {
  const { t } = useTranslation();
  const localized = useLocalizedPath();
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
        {t("notFound.title")}
      </h1>
      <p className="not-found-hint">
        {inApp ? t("notFound.hintSection") : t("notFound.hintPage")}
      </p>
      <div className="not-found-actions">
        {inApp ? (
          <>
            <Link to="/app/inbox" className="btn btn-primary">
              {t("notFound.inbox")}
            </Link>
            <Link to="/app/leads" className="btn btn-secondary">
              {t("notFound.leads")}
            </Link>
          </>
        ) : (
          <>
            <Link to={localized("/")} className="btn btn-primary">
              {t("notFound.home")}
            </Link>
            <Link to={localized("/login")} className="btn btn-secondary">
              {t("notFound.signIn")}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
