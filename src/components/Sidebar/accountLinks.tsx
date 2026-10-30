import i18next from "i18next";
import type { ReactNode } from "react";
import type { AccountFeatures, SessionFlags } from "../../api/types";
import { CONSUMER_PAGES, type ConsumerPage, type ConsumerPageKey } from "../../util/consumerPages";
import { BellIcon, CardIcon, ShareIcon, UserIcon } from "../icons/UiIcons";

export type AccountLink = ConsumerPage & {
  icon: ReactNode;
};

export const ACCOUNT_PAGE = "/app/cuenta";

export function accountLinks({
  features,
  isReseller,
  account,
}: Pick<SessionFlags, "features" | "isReseller"> & { account?: AccountFeatures }): AccountLink[] {
  const links: AccountLink[] = [];
  if (account?.settings) links.push({ to: ACCOUNT_PAGE, label: i18next.t("userMenu.yourAccount", { ns: "shell" }), icon: <UserIcon /> });
  if (features.billing) links.push({ to: "/app/billing", label: i18next.t("userMenu.billing", { ns: "shell" }), icon: <CardIcon /> });
  if (isReseller) links.push({ to: "/app/reseller", label: i18next.t("userMenu.reseller", { ns: "shell" }), icon: <ShareIcon /> });
  if (features.notifications) links.push({ to: "/app/notificaciones", label: i18next.t("userMenu.notifications", { ns: "shell" }), icon: <BellIcon /> });
  return links;
}

export function consumerLinks({ features }: Pick<SessionFlags, "features">): ConsumerPage[] {
  if (!features.legal) return [];
  return CONSUMER_PAGES.map(({ to, key }) => ({ to, label: consumerLabel(key) }));
}

function consumerLabel(key: ConsumerPageKey): string {
  return i18next.t(`consumer.${key}`, { ns: "common" });
}
