import type { AppNotification, NotificationKind } from "../api/types";
import { platformLabel } from "./labels";

export type NoticeMessage = {
  kind: NotificationKind;
  text: string;
};

function newLeadText(notices: AppNotification[]): string {
  const platforms = new Set(notices.map((notice) => notice.platform));
  const [platform] = platforms;
  const channel = platforms.size === 1 ? ` por ${platformLabel(platform)}` : "";
  return notices.length === 1 ? `Entró un lead nuevo${channel}` : `Entraron ${notices.length} leads nuevos${channel}`;
}

function handoffText(count: number): string {
  return count === 1 ? "Una conversación necesita tu respuesta" : `${count} conversaciones necesitan tu respuesta`;
}

export function noticeMessages(notices: AppNotification[]): NoticeMessage[] {
  const leads = notices.filter((notice) => notice.kind === "NEW_LEAD");
  const handoffs = notices.filter((notice) => notice.kind === "HANDOFF");
  const messages: NoticeMessage[] = [];
  if (leads.length > 0) messages.push({ kind: "NEW_LEAD", text: newLeadText(leads) });
  if (handoffs.length > 0) messages.push({ kind: "HANDOFF", text: handoffText(handoffs.length) });
  return messages;
}
