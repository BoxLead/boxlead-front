import type { ReactNode } from "react";
import { AuthFrame } from "../../../src/components/AuthLayout/AuthFrame";
import { LEGAL_ENTITY_NAME, PRODUCT_NAME } from "../../../src/util/company";
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
    <AuthFrame homeLabel={`${PRODUCT_NAME} — inicio`} legal={`${PRODUCT_NAME} es una marca de ${LEGAL_ENTITY_NAME}.`}>
      <p className="entry-eyebrow">Backoffice</p>
      <h1 className="auth-title">{title}</h1>
      {subtitle ? <p className="auth-subtitle">{subtitle}</p> : null}
      <div className="entry-body">{children}</div>
    </AuthFrame>
  );
}
