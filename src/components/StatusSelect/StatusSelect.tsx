import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiError } from "../../api/client";
import type { LeadResponse, LeadStatus } from "../../api/types";
import { updateLeadStatus } from "../../data/leads";
import { LEAD_STATUSES, leadDisplayName, leadStatusLabel } from "../../util/labels";
import { ChevronDownIcon } from "../icons/UiIcons";
import { useToast } from "../ui/toast";
import "./StatusSelect.css";
import { intlLocale } from "../../i18n/locale";

type StatusSelectProps = {
  lead: LeadResponse;
  size?: "sm" | "md";
};

export function StatusSelect({ lead, size = "sm" }: StatusSelectProps) {
  const { t } = useTranslation("shell");
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  async function change(status: LeadStatus) {
    if (status === lead.status) return;
    setSaving(true);
    try {
      await updateLeadStatus(lead, status);
      toast({
        message: t("statusSelect.changed", {
          name: leadDisplayName(lead),
          status: leadStatusLabel(status).toLocaleLowerCase(intlLocale()),
        }),
      });
    } catch (error) {
      toast({
        tone: "danger",
        message: error instanceof ApiError ? error.message : t("statusSelect.failed"),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <label className={`status-select status-select-${size} status-select-${lead.status.toLowerCase()}`}>
      <span className="visually-hidden">{t("statusSelect.label", { name: leadDisplayName(lead) })}</span>
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
