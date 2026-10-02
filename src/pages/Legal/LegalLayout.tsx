import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { Logo } from "../../components/Logo/Logo";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { LEGAL_ENTITY_NAME, PRODUCT_NAME } from "../../util/company";
import "./Legal.css";

const pages = [
  { to: "/privacy-policy", label: "Privacy Policy" },
  { to: "/terms-of-service", label: "Terms of Service" },
  { to: "/data-deletion", label: "Data Deletion" },
];

type LegalLayoutProps = {
  title: string;
  updated: string;
  children: ReactNode;
};

export function LegalLayout({ title, updated, children }: LegalLayoutProps) {
  useDocumentTitle(title);

  return (
    <div className="legal">
      <header className="legal-header">
        <div className="legal-header-inner">
          <Link
            to="/"
            className="legal-brand"
            aria-label={`${PRODUCT_NAME} — home`}
          >
            <Logo />
          </Link>
          <Link to="/" className="legal-back">
            &larr; Back to {PRODUCT_NAME}
          </Link>
        </div>
      </header>

      <main className="legal-page">
        <h1>{title}</h1>
        <p className="legal-updated">Last updated: {updated}</p>
        {children}
      </main>

      <footer className="legal-footer">
        <nav className="legal-footer-nav" aria-label="Legal">
          {pages.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `legal-footer-link${isActive ? " legal-footer-link-active" : ""}`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <p>
          © {new Date().getFullYear()} {LEGAL_ENTITY_NAME}
        </p>
      </footer>
    </div>
  );
}
