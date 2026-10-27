import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { Money as MoneyValue } from "../../api/types";
import { Money } from "../../components/Money";
import { StatusBadge } from "../../components/StatusBadge";
import type { StatusLabel } from "./labels";
import "./Billing.css";

export function StatusTag({ status, detail }: { status: StatusLabel; detail?: string | null }) {
  return <StatusBadge status={status} detail={detail} />;
}

export function ShortId({ id }: { id: string }) {
  return (
    <span className="billing-id" title={id}>
      {id.slice(0, 8)}
    </span>
  );
}

export function CustomerCell({ userId, email }: { userId: string; email?: string | null }) {
  return (
    <Link className="billing-customer" to={`/usuarios/${encodeURIComponent(userId)}`}>
      {email ?? <ShortId id={userId} />}
    </Link>
  );
}

export function Amount({ money, code = false }: { money: MoneyValue; code?: boolean }) {
  return <Money money={money} code={code} />;
}

export function Stack({ main, detail }: { main: ReactNode; detail?: ReactNode }) {
  return (
    <span className="billing-stack">
      <span>{main}</span>
      {detail ? <span className="billing-detail">{detail}</span> : null}
    </span>
  );
}

export function RowActions({ children }: { children: ReactNode }) {
  return <span className="billing-actions">{children}</span>;
}

export function NoAction() {
  return <span className="billing-detail">—</span>;
}
