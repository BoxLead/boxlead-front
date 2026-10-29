import type { ReactNode } from "react";
import type { AccountFeatures, SessionFlags } from "../../api/types";
import { CONSUMER_PAGES, type ConsumerPage } from "../../util/consumerPages";
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
  if (account?.settings) links.push({ to: ACCOUNT_PAGE, label: "Tu cuenta", icon: <UserIcon /> });
  if (features.billing) links.push({ to: "/app/billing", label: "Facturación", icon: <CardIcon /> });
  if (isReseller) links.push({ to: "/app/reseller", label: "Revendedor", icon: <ShareIcon /> });
  if (features.notifications) links.push({ to: "/app/notificaciones", label: "Notificaciones", icon: <BellIcon /> });
  return links;
}

export function consumerLinks({ features }: Pick<SessionFlags, "features">): readonly ConsumerPage[] {
  return features.legal ? CONSUMER_PAGES : [];
}
