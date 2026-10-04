import { GoogleAdsIcon, TikTokIcon } from "../components/icons/PlatformIcons";
import { emailAndPhone } from "./shared";
import type { PlatformDefinition } from "./types";

const readOnly = {
  connect: null,
  syncs: [],
  stageLabels: { PRE_SALE: "Mensajes" },
  reply: () => ({ kind: "chat" as const, maxLength: null, placeholder: "Escribí un mensaje", hint: null }),
  explainError: () => null,
  contactFields: emailAndPhone,
};

export const tiktok: PlatformDefinition = {
  ...readOnly,
  id: "TIKTOK",
  name: "TikTok",
  accountNoun: "cuenta",
  summary: "Próximamente.",
  logo: (size) => <TikTokIcon width={size} height={size} aria-hidden="true" />,
};

export const googleAds: PlatformDefinition = {
  ...readOnly,
  id: "GOOGLE_ADS",
  name: "Google Ads",
  accountNoun: "cuenta",
  summary: "Próximamente.",
  logo: (size) => <GoogleAdsIcon width={size} height={size} aria-hidden="true" />,
};
