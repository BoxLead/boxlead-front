import type { UnsubscribeScope } from "../../api/types";
import { readUnsubscribeScope } from "../../data/notifications";

export type UnsubscribeLink = { token: string; scope: UnsubscribeScope } | null;

export const SCOPE_TEXT: Record<UnsubscribeScope, string> = {
  NEW_LEAD: "Vas a dejar de recibir los mails de leads nuevos.",
  HANDOFF: "Vas a dejar de recibir los mails de conversaciones que el agente pasa a una persona.",
  ALL: "Vas a dejar de recibir todos los mails de avisos de BoxLead.",
};

export function readUnsubscribeLink(search: string): UnsubscribeLink {
  const params = new URLSearchParams(search);
  const token = params.get("token")?.trim() ?? "";
  if (!token) return null;
  return { token, scope: readUnsubscribeScope(params.get("scope")) ?? "ALL" };
}
