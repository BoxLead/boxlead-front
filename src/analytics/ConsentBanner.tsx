import { useTranslation } from "react-i18next";
import { RichText } from "../i18n/RichText";
import { useConsent } from "./consent";
import { applyConsent } from "./gtag";
import "./ConsentBanner.css";

export function ConsentBanner() {
  const { t } = useTranslation();
  const consent = useConsent();
  if (consent !== null) return null;

  return (
    <section className="consent panel-elevated" aria-labelledby="consent-heading">
      <div className="consent-body">
        <h2 className="consent-heading" id="consent-heading">
          {t("consent.title")}
        </h2>
        <p className="consent-text">
          <RichText text={t("consent.text")} />
        </p>
      </div>
      <div className="consent-actions">
        <button type="button" className="btn btn-secondary" onClick={() => applyConsent("denied")}>
          {t("consent.reject")}
        </button>
        <button type="button" className="btn btn-primary" onClick={() => applyConsent("granted")}>
          {t("consent.accept")}
        </button>
      </div>
    </section>
  );
}
