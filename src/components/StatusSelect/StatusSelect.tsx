import { useState } from "react";
import { ApiError } from "../../api/client";
import type { LeadResponse, LeadStatus } from "../../api/types";
import { updateLeadStatus } from "../../data/leads";
import { LEAD_STATUSES, leadDisplayName, leadStatusLabel } from "../../util/labels";
import { ChevronDownIcon } from "../icons/UiIcons";
import { useToast } from "../ui/toast";
import "./StatusSelect.css";

type StatusSelectProps = {
  lead: LeadResponse;
  size?: "sm" | "md";
};

export function StatusSelect({ lead, size = "sm" }: StatusSelectProps) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  async function change(status: LeadStatus) {
    if (status === lead.status) return;
    setSaving(true);
    try {
      await updateLeadStatus(lead, status);
      toast({ message: `${leadDisplayName(lead)} pasó a ${leadStatusLabel(status).toLocaleLowerCase("es-AR")}.` });
    } catch (error) {
      toast({
        tone: "danger",
        message: error instanceof ApiError ? error.message : "No pudimos cambiar el estado. Probá de nuevo.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <label className={`status-select status-select-${size} status-select-${lead.status.toLowerCase()}`}>
      <span className="visually-hidden">Estado de {leadDisplayName(lead)}</span>
      <select
        value={lead.status}
        disabled={saving}
        onChange={(event) => void change(event.target.value as LeadStatus)}
        onClick={(event) => event.stopPropagation()}
      >
        {LEAD_STATUSES.map((status) => (
          <option key={status} value={status}>
            {leadStatusLabel(status)}
          </option>
        ))}
      </select>
      <ChevronDownIcon width={14} height={14} />
    </label>
  );
}
