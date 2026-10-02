import type { LeadStatus } from "../../api/types";
import { leadStatusLabel } from "../../util/labels";
import "./StatusBadge.css";

export function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span className={`status-badge status-badge-${status.toLowerCase()}`}>
      {leadStatusLabel(status)}
    </span>
  );
}
