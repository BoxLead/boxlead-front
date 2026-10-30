import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Logo } from "../Logo/Logo";
import "./AuthLayout.css";

type AuthFrameProps = {
  homeLabel: string;
  homePath?: string;
  legal: string;
  children: ReactNode;
};

export function AuthFrame({ homeLabel, homePath = "/", legal, children }: AuthFrameProps) {
  return (
    <div className="auth-layout">
      <Link to={homePath} className="auth-brand" aria-label={homeLabel}>
        <Logo />
      </Link>

      <main className="auth-shell">{children}</main>

      <p className="auth-legal">{legal}</p>
    </div>
  );
}
