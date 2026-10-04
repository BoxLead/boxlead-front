import type { LeadResponse } from "../api/types";
import type { ContactField, PlatformErrorView } from "./types";

export function emailAndPhone(lead: LeadResponse): ContactField[] {
  const fields: ContactField[] = [];
  if (lead.email) {
    fields.push({ label: "Email", value: lead.email, href: `mailto:${lead.email}` });
  }
  if (lead.phone) {
    fields.push({ label: "Teléfono", value: lead.phone, href: `tel:${lead.phone.replace(/[^\d+]/g, "")}` });
  }
  return fields;
}

export function reconnectError(platformName: string, message: string): PlatformErrorView | null {
  if (!/must be reconnected/i.test(message)) return null;
  return {
    title: `Hay que reconectar ${platformName}`,
    detail: "La autorización venció o fue revocada. Reconectá la cuenta para volver a responder.",
    action: "reconnect",
  };
}

export function lengthError(maxLength: number): PlatformErrorView {
  return {
    title: "El mensaje es demasiado largo",
    detail: `El máximo para este canal es de ${maxLength.toLocaleString("es-AR")} caracteres.`,
    action: null,
  };
}
