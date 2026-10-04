import type { LeadResponse, LeadStatus, PlatformType } from "../api/types";
import { getPlatform } from "../platforms";

const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: "Nuevo",
  CONTACTED: "Contactado",
  QUALIFIED: "Calificado",
  LOST: "Perdido",
  CLOSED: "Cerrado",
};

export const LEAD_STATUSES = Object.keys(LEAD_STATUS_LABELS) as LeadStatus[];

export function platformLabel(platform: PlatformType): string {
  return getPlatform(platform).name;
}

export function leadStatusLabel(status: LeadStatus): string {
  return LEAD_STATUS_LABELS[status];
}

export function leadDisplayName(lead: LeadResponse | undefined): string {
  if (!lead) return "Lead sin identificar";
  return (
    lead.name?.trim() ||
    lead.email?.trim() ||
    lead.phone?.trim() ||
    lead.externalLeadId ||
    "Lead sin nombre"
  );
}
