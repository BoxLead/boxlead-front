import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiError } from "../../api/client";
import type { LeadResponse, LeadTemperature } from "../../api/types";
import { assignLeadTemperature } from "../../data/leads";
import { LEAD_TEMPERATURES, leadDisplayName, leadTemperatureLabel } from "../../util/labels";
import { ChevronDownIcon } from "../icons/UiIcons";
import { useToast } from "../ui/toast";
import "./TemperatureSelect.css";
import { intlLocale } from "../../i18n/locale";

type TemperatureSelectProps = {
  lead: LeadResponse;
  size?: "sm" | "md";
};

const NONE = "";

export function TemperatureSelect({ lead, size = "sm" }: TemperatureSelectProps) {
  const { t } = useTranslation("shell");
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const current = lead.temperature ?? null;

  async function change(value: string) {
    const temperature = value === NONE ? null : (value as LeadTemperature);
    if (temperature === current) return;
    setSaving(true);
    try {
      await assignLeadTemperature(lead, temperature);
      const name = leadDisplayName(lead);
      toast({
        message: temperature
          ? t("temperatureSelect.changed", {
              name,
              temperature: leadTemperatureLabel(temperature).toLocaleLowerCase(intlLocale()),
            })
          : t("temperatureSelect.cleared", { name }),
      });
    } catch (error) {
      toast({
        tone: "danger",
        message: error instanceof ApiError ? error.message : t("temperatureSelect.failed"),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <label
      className={`temperature-select temperature-select-${size} temperature-select-${current ? current.toLowerCase() : "unset"}`}
    >
      <span className="visually-hidden">{t("temperatureSelect.label", { name: leadDisplayName(lead) })}</span>
      <select
        value={current ?? NONE}
        disabled={saving}
        onChange={(event) => void change(event.target.value)}
        onClick={(event) => event.stopPropagation()}
      >
        <option value={NONE}>{t("temperatureSelect.none")}</option>
        {LEAD_TEMPERATURES.map((temperature) => (
          <option key={temperature} value={temperature}>
            {leadTemperatureLabel(temperature)}
          </option>
        ))}
      </select>
      <ChevronDownIcon width={14} height={14} />
    </label>
  );
}
