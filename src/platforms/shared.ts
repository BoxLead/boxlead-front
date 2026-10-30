import i18next from "i18next";
import type { LeadResponse } from "../api/types";
import type { ContactField, PlatformErrorView } from "./types";
import { intlLocale } from "../i18n/locale";

export function channelT() {
  return i18next.getFixedT(null, "connections");
}

export function emailAndPhone(lead: LeadResponse): ContactField[] {
  const t = channelT();
  const fields: ContactField[] = [];
  if (lead.email) {
    fields.push({ label: t("channel.email"), value: lead.email, href: `mailto:${lead.email}` });
  }
  if (lead.phone) {
    fields.push({ label: t("channel.phone"), value: lead.phone, href: `tel:${lead.phone.replace(/[^\d+]/g, "")}` });
  }
  return fields;
}

export function reconnectError(platformName: string, message: string): PlatformErrorView | null {
  if (!/must be reconnected/i.test(message)) return null;
  const t = channelT();
  return {
    title: t("channel.reconnectTitle", { name: platformName }),
    detail: t("channel.reconnectDetail"),
    action: "reconnect",
  };
}

export function lengthError(maxLength: number): PlatformErrorView {
  const t = channelT();
  return {
    title: t("channel.tooLongTitle"),
    detail: t("channel.tooLongDetail", { max: maxLength.toLocaleString(intlLocale()) }),
    action: null,
  };
}
