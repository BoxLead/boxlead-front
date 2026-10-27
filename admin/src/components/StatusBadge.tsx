import { Tag } from "../../../src/components/ui/Tag";
import type { StatusLabel } from "../status";
import "./StatusBadge.css";

type StatusBadgeProps = {
  status: StatusLabel;
  detail?: string | null;
};

export function StatusBadge({ status, detail }: StatusBadgeProps) {
  return (
    <span className="status-badge" title={detail ?? undefined}>
      <Tag tone={status.tone}>{status.label}</Tag>
    </span>
  );
}
