import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  LEGAL_ENTITY_NAME,
  PRODUCT_NAME,
  SUPPORT_EMAIL,
} from "../../util/company";
import { CookiePreferences } from "../../analytics/CookiePreferences";
import { trackEvent } from "../../analytics/gtag";
import { Logo } from "../../components/Logo/Logo";
import { ProviderDetails } from "../../components/ProviderDetails/ProviderDetails";
import { useLanguage, useLocalizedPath } from "../../i18n/useLanguage";
import { CONSUMER_PAGES } from "../../util/consumerPages";
import { BILLING_ENABLED } from "../flags";
import { editorialPages } from "../editorial";
import { DataFiscal } from "./DataFiscal";
import { LanguageSwitch } from "./LanguageSwitch";
import "./Footer.css";

type LegalLink = { to: string; label: "terms" | "privacy" | "contracts" | "dataDeletion" };

const LEGAL_LINKS: Record<"es" | "en", LegalLink[]> = {
  es: [
    { to: "/terminos", label: "terms" },
    { to: "/privacidad", label: "privacy" },
    { to: "/contratos", label: "contracts" },
    { to: "/privacidad#derechos", label: "dataDeletion" },
  ],
  en: [
    { to: "/terms-of-service", label: "terms" },
    { to: "/privacy-policy", label: "privacy" },
    { to: "/contratos", label: "contracts" },
    { to: "/data-deletion", label: "dataDeletion" },
  ],
};

export function Footer() {
  const { t } = useTranslation("landing");
  const { t: tc } = useTranslation();
  const language = useLanguage();
  const localized = useLocalizedPath();
  const year = new Date().getFullYear();

  return (
    <footer className="landing-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <Logo />
          <p className="footer-tagline">{t("footer.tagline")}</p>
          <p className="footer-legal-entity">{t("footer.brand", { product: PRODUCT_NAME, entity: LEGAL_ENTITY_NAME })}</p>
          <LanguageSwitch className="footer-language" full />
        </div>

        <nav className="footer-column" aria-label={t("footer.product")}>
          <h2 className="footer-heading">{t("footer.product")}</h2>
          <a href={localized("/#demo")} className="footer-link">
            {t("header.links.demo")}
          </a>
          <a href={localized("/#como-funciona")} className="footer-link">
            {t("header.links.howItWorks")}
          </a>
          <a href={localized("/#agente")} className="footer-link">
            {t("header.links.agent")}
          </a>
          {BILLING_ENABLED && (
            <a href={localized("/#planes")} className="footer-link">
              {t("header.links.plans")}
            </a>
          )}
          <a href={localized("/#faq")} className="footer-link">
            {t("footer.faq")}
          </a>
          <Link to={localized("/login")} className="footer-link">
            {t("footer.signIn")}
          </Link>
        </nav>

        <nav className="footer-column" aria-label={t("footer.channels")}>
          <h2 className="footer-heading">{t("footer.channels")}</h2>
          {editorialPages(language).map((page) => (
            <Link to={page.path} className="footer-link" key={page.path}>
              {page.label}
            </Link>
          ))}
        </nav>

        <nav className="footer-column" aria-label={t("footer.legal")}>
          <h2 className="footer-heading">{t("footer.legal")}</h2>
          {LEGAL_LINKS[language].map((link) => (
            <Link to={link.to} className="footer-link" key={link.to}>
              {t(`footer.${link.label}`)}
            </Link>
          ))}
        </nav>

        <div className="footer-column">
          <h2 className="footer-heading">{t("footer.support")}</h2>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="footer-link" onClick={() => trackEvent("contacto", { ubicacion: "pie" })}>
            {SUPPORT_EMAIL}
          </a>
          <nav className="footer-consumer" aria-label={t("footer.consumer")}>
            {CONSUMER_PAGES.map((page) => (
              <Link to={page.to} className="footer-link" key={page.to}>
                {tc(`consumer.${page.key}`)}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <section className="footer-provider" aria-labelledby="footer-provider-heading">
        <div className="footer-provider-body">
          <h2 className="footer-heading" id="footer-provider-heading">
            {t("footer.provider")}
          </h2>
          <ProviderDetails className="footer-provider-details" />
        </div>
        <DataFiscal />
      </section>

      <div className="footer-bottom">
        <p suppressHydrationWarning>{t("footer.rights", { year, entity: LEGAL_ENTITY_NAME })}</p>
        <p>{t("footer.trademarks")}</p>
        <CookiePreferences className="footer-preferences" />
      </div>

      <p className="footer-wordmark" aria-hidden="true">
        <strong>BOX</strong>LEAD
      </p>
    </footer>
  );
}
