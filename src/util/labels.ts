import i18next from "i18next";
import type { LeadResponse, LeadStatus, LeadTemperature, PlatformType } from "../api/types";
import { getPlatform } from "../platforms";

export const LEAD_STATUSES: LeadStatus[] = ["NEW", "CONTACTED", "QUALIFIED", "LOST", "CLOSED"];

export const LEAD_TEMPERATURES: LeadTemperature[] = ["COLD", "WARM", "HOT"];

export function leadTemperatureLabel(temperature: LeadTemperature): string {
  return i18next.t(`lead.temperature.${temperature}`, { ns: "shell" });
}

export function platformLabel(platform: PlatformType): string {
  return getPlatform(platform).name;
}

export function leadStatusLabel(status: LeadStatus): string {
  return i18next.t(`lead.status.${status}`, { ns: "shell" });
}

export function leadDisplayName(lead: LeadResponse | undefined): string {
  if (!lead) return i18next.t("lead.unidentified", { ns: "shell" });
  return (
    lead.name?.trim() ||
    lead.email?.trim() ||
    lead.phone?.trim() ||
    (getPlatform(lead.platform).externalIdIsContact ? lead.externalLeadId : null) ||
    i18next.t("lead.platformContact", { ns: "shell", platform: getPlatform(lead.platform).name })
  );
}
