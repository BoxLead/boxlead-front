import type { ReactNode } from "react";
import type { SessionFlags } from "../../api/types";
import { CardIcon, ShareIcon } from "../icons/UiIcons";

export type ConsumerLink = {
  to: string;
  label: string;
};

export type AccountLink = ConsumerLink & {
  icon: ReactNode;
};

export function accountLinks({ features, isReseller }: Pick<SessionFlags, "features" | "isReseller">): AccountLink[] {
  const links: AccountLink[] = [];
  if (features.billing) links.push({ to: "/app/billing", label: "Facturación", icon: <CardIcon /> });
  if (isReseller) links.push({ to: "/app/reseller", label: "Revendedor", icon: <ShareIcon /> });
  return links;
}

export function consumerLinks({ features }: Pick<SessionFlags, "features">): ConsumerLink[] {
  if (!features.legal) return [];
  return [
    { to: "/arrepentimiento", label: "Botón de arrepentimiento" },
    { to: "/baja", label: "Botón de baja de servicio" },
  ];
}
