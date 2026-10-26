import type { ReactNode } from "react";
import { AuthLayout } from "../../../src/components/AuthLayout/AuthLayout";
import { useTitle } from "../components/useTitle";
import "./EntryLayout.css";

type EntryLayoutProps = {
  title: string;
  subtitle?: ReactNode;
  children?: ReactNode;
};

export function EntryLayout({ title, subtitle, children }: EntryLayoutProps) {
  useTitle(title);
  return (
    <AuthLayout>
      <p className="entry-eyebrow">Backoffice</p>
      <h1 className="auth-title">{title}</h1>
      {subtitle ? <p className="auth-subtitle">{subtitle}</p> : null}
      <div className="entry-body">{children}</div>
    </AuthLayout>
  );
}
