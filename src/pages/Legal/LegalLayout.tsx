import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { Logo } from "../../components/Logo/Logo";
import { ProviderDetails } from "../../components/ProviderDetails/ProviderDetails";
import { cx } from "../../util/classNames";
import { LEGAL_ENTITY_NAME, PRODUCT_NAME } from "../../util/company";
import { CONSUMER_PAGES, type ConsumerPage } from "../../util/consumerPages";
import "./Legal.css";

export type LegalLanguage = "es" | "en";

type LegalCopy = {
  home: string;
  back: string;
  navLabel: string;
  pages: readonly ConsumerPage[];
};

const COPY: Record<LegalLanguage, LegalCopy> = {
  es: {
    home: `${PRODUCT_NAME}, inicio`,
    back: `Volver a ${PRODUCT_NAME}`,
    navLabel: "Legales",
    pages: [
      { to: "/terminos", label: "Términos y condiciones" },
      { to: "/privacidad", label: "Política de privacidad" },
      { to: "/contratos", label: "Contratos de adhesión" },
      ...CONSUMER_PAGES,
    ],
  },
  en: {
    home: `${PRODUCT_NAME}, home`,
    back: `Back to ${PRODUCT_NAME}`,
    navLabel: "Legal",
    pages: [
      { to: "/privacy-policy", label: "Privacy Policy" },
      { to: "/terms-of-service", label: "Terms of Service" },
      { to: "/data-deletion", label: "Data Deletion" },
    ],
  },
};

type LegalLayoutProps = {
  title: string;
  language: LegalLanguage;
  meta?: string;
  notice?: ReactNode;
  children: ReactNode;
};

export function LegalLayout({ title, language, meta, notice, children }: LegalLayoutProps) {
  const copy = COPY[language];

  return (
    <div className="legal" lang={language}>
      <header className="legal-header">
        <div className="legal-header-inner">
          <Link to="/" className="legal-brand" aria-label={copy.home}>
            <Logo />
          </Link>
          <Link to="/" className="legal-back">
            &larr; {copy.back}
          </Link>
        </div>
      </header>

      <main className="legal-page">
        <h1>{title}</h1>
        {meta ? <p className="legal-updated">{meta}</p> : null}
        {notice ? <div className="legal-notice">{notice}</div> : null}
        {children}
      </main>

      <footer className="legal-footer">
        <nav className="legal-footer-nav" aria-label={copy.navLabel}>
          {copy.pages.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => cx("legal-footer-link", isActive && "legal-footer-link-active")}
            >
              {label}
            </NavLink>
          ))}
        </nav>
        {language === "es" ? <ProviderDetails className="legal-footer-provider" /> : null}
        <p suppressHydrationWarning>
          © {new Date().getFullYear()} {LEGAL_ENTITY_NAME}
        </p>
      </footer>
    </div>
  );
}
