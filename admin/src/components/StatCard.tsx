import type { ReactNode } from "react";
import { cx } from "../../../src/util/classNames";
import { formatCount } from "../format";
import "./StatCard.css";

type Delta = { value: number; label: string };

type StatCardProps = {
  label: string;
  value: ReactNode;
  period?: string;
  detail?: ReactNode;
  delta?: Delta;
  tone?: "neutral" | "danger";
};

function deltaTone(delta: Delta, tone: StatCardProps["tone"]): string {
  if (delta.value === 0) return "stat-delta-flat";
  const up = delta.value > 0;
  const good = tone === "danger" ? !up : up;
  return good ? "stat-delta-up" : "stat-delta-down";
}

export function StatCard({ label, value, period, detail, delta, tone = "neutral" }: StatCardProps) {
  return (
    <article className="panel stat-card">
      <header className="stat-head">
        <p className="stat-label">{label}</p>
        {period ? <p className="stat-period">{period}</p> : null}
      </header>
      <p className="stat-value num">{value}</p>
      {delta ? (
        <p className={cx("stat-delta num", deltaTone(delta, tone))}>
          <span className="stat-delta-value">
            {delta.value > 0 ? "+" : ""}
            {formatCount(delta.value)}
          </span>
          <span className="stat-delta-label">{delta.label}</span>
        </p>
      ) : detail ? (
        <p className="stat-detail">{detail}</p>
      ) : null}
    </article>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="stat-grid">{children}</div>;
}
