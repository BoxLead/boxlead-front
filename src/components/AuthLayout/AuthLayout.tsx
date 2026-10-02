import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { LEGAL_ENTITY_NAME, PRODUCT_NAME } from "../../util/company";
import { Logo } from "../Logo/Logo";
import "./AuthLayout.css";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-layout">
      <Link
        to="/"
        className="auth-brand"
        aria-label={`${PRODUCT_NAME} — inicio`}
      >
        <Logo />
      </Link>

      <main className="auth-shell">{children}</main>

      <p className="auth-legal">
        {PRODUCT_NAME} es una marca de {LEGAL_ENTITY_NAME}.
      </p>
    </div>
  );
}
