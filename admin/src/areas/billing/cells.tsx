import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Tag } from "../../../../src/components/ui/Tag";
import type { Money } from "../../api/types";
import { formatMoney } from "../../format";
import type { StatusLabel } from "./labels";
import "./Billing.css";

export function StatusTag({ status }: { status: StatusLabel }) {
  return (
    <span className="billing-tag">
      <Tag tone={status.tone}>{status.label}</Tag>
    </span>
  );
}

export function ShortId({ id }: { id: string }) {
  return (
    <span className="billing-id num" title={id}>
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

export function Amount({ money }: { money: Money }) {
  return <span className="num billing-amount">{formatMoney(money)}</span>;
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
