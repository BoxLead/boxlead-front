import type { LeadResponse, LeadStatus, PlatformType } from "../api/types";

const PLATFORM_LABELS: Record<PlatformType, string> = {
  META: "Messenger",
  INSTAGRAM: "Instagram",
  WHATSAPP: "WhatsApp",
  MELI: "MercadoLibre",
  TIKTOK: "TikTok",
  GOOGLE_ADS: "Google Ads",
};

const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: "Nuevo",
  CONTACTED: "Contactado",
  QUALIFIED: "Calificado",
  LOST: "Perdido",
  CLOSED: "Cerrado",
};

export const LEAD_STATUSES = Object.keys(LEAD_STATUS_LABELS) as LeadStatus[];

export function platformLabel(platform: PlatformType): string {
  return PLATFORM_LABELS[platform];
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
