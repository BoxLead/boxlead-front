import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { LEGAL_ENTITY_NAME, PRODUCT_NAME } from "../../util/company";
import { Logo } from "../Logo/Logo";
import "./AuthLayout.css";

const highlights = [
  "Responde cada lead en segundos",
  "Califica y ordena tu pipeline",
  "Todos tus canales, las 24 horas",
];

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-layout">
      <aside className="auth-aside">
        <Link
          to="/"
          className="auth-brand"
          aria-label={`${PRODUCT_NAME} — inicio`}
        >
          <Logo />
        </Link>
        <div className="auth-aside-body">
          <p className="auth-aside-title">
            Tu agente sigue trabajando,{" "}
            <span className="auth-aside-accent">aunque vos no estés.</span>
          </p>
          <ul className="auth-aside-list">
            {highlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <p className="auth-aside-legal">
          {PRODUCT_NAME} es una marca de {LEGAL_ENTITY_NAME}.
        </p>
      </aside>

      <main className="auth-main">
        <Link
          to="/"
          className="auth-brand auth-brand-mobile"
          aria-label={`${PRODUCT_NAME} — inicio`}
        >
          <Logo />
        </Link>
        {children}
      </main>
    </div>
  );
}
