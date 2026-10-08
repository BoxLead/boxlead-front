import type { ReactNode } from "react";
import "./KpiCard.css";

type KpiCardProps = {
  label: string;
  value: string;
  delta?: ReactNode;
  caption?: ReactNode;
  visual?: ReactNode;
  highlight?: boolean;
};

export function KpiCard({ label, value, delta, caption, visual, highlight }: KpiCardProps) {
  return (
    <li className={`kpi-card${highlight ? " kpi-card-highlight" : ""}`}>
      <span className="kpi-label">{label}</span>
      <span className="kpi-value-row">
        <span className="kpi-value">{value}</span>
        {delta}
      </span>
      {visual ? <span className="kpi-visual">{visual}</span> : null}
      {caption ? <span className="kpi-caption">{caption}</span> : null}
    </li>
  );
}
