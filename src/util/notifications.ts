import i18next from "i18next";
import type { AppNotification, NotificationKind } from "../api/types";
import { platformLabel } from "./labels";

export type NoticeMessage = {
  kind: NotificationKind;
  text: string;
};

function newLeadText(notices: AppNotification[]): string {
  const platforms = new Set(notices.map((notice) => notice.platform));
  const [platform] = platforms;
  const count = notices.length;
  if (platforms.size === 1) return i18next.t("notifications.notice.newLeadOn", { ns: "account", count, channel: platformLabel(platform) });
  return i18next.t("notifications.notice.newLead", { ns: "account", count });
}

function handoffText(count: number): string {
  return i18next.t("notifications.notice.handoff", { ns: "account", count });
}

export function noticeMessages(notices: AppNotification[]): NoticeMessage[] {
  const leads = notices.filter((notice) => notice.kind === "NEW_LEAD");
  const handoffs = notices.filter((notice) => notice.kind === "HANDOFF");
  const messages: NoticeMessage[] = [];
  if (leads.length > 0) messages.push({ kind: "NEW_LEAD", text: newLeadText(leads) });
  if (handoffs.length > 0) messages.push({ kind: "HANDOFF", text: handoffText(handoffs.length) });
  return messages;
}
