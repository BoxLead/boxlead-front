import { useState } from "react";
import { ApiError } from "../../api/client";
import type { LeadResponse, LeadTemperature } from "../../api/types";
import { assignLeadTemperature } from "../../data/leads";
import { LEAD_TEMPERATURES, leadDisplayName, leadTemperatureLabel } from "../../util/labels";
import { ChevronDownIcon } from "../icons/UiIcons";
import { useToast } from "../ui/toast";
import "./TemperatureSelect.css";

type TemperatureSelectProps = {
  lead: LeadResponse;
  size?: "sm" | "md";
};

const NONE = "";

export function TemperatureSelect({ lead, size = "sm" }: TemperatureSelectProps) {
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
          ? `${name} quedó ${leadTemperatureLabel(temperature).toLocaleLowerCase("es-AR")}.`
          : `${name} quedó sin evaluar.`,
      });
    } catch (error) {
      toast({
        tone: "danger",
        message: error instanceof ApiError ? error.message : "No pudimos cambiar la temperatura. Probá de nuevo.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <label
      className={`temperature-select temperature-select-${size} temperature-select-${current ? current.toLowerCase() : "unset"}`}
    >
      <span className="visually-hidden">Temperatura de {leadDisplayName(lead)}</span>
      <select
        value={current ?? NONE}
        disabled={saving}
        onChange={(event) => void change(event.target.value)}
        onClick={(event) => event.stopPropagation()}
      >
        <option value={NONE}>Sin evaluar</option>
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
