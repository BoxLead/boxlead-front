import type { ReactNode } from "react";
import { GoogleAdsIcon, TikTokIcon } from "../components/icons/PlatformIcons";
import { channelT, emailAndPhone } from "./shared";
import type { PlatformDefinition } from "./types";

function upcoming(id: "TIKTOK" | "GOOGLE_ADS", name: string, logo: (size: number) => ReactNode): PlatformDefinition {
  return {
    id,
    name,
    get accountNoun() {
      return channelT()("channel.accountNoun");
    },
    get addAnother() {
      return channelT()("channel.addAccount");
    },
    get summary() {
      return channelT()(`platforms.${id}.summary`);
    },
    connect: null,
    syncs: [],
    howItWorks: [],
    get stageLabels() {
      return { PRE_SALE: channelT()("channel.messages") };
    },
    reply: () => ({ kind: "chat", maxLength: null, placeholder: channelT()("channel.messagePlaceholder"), hint: null }),
    explainError: () => null,
    contactFields: emailAndPhone,
    hasContext: false,
    contextStatus: () => null,
    canStartConversation: false,
    externalIdIsContact: false,
    logo,
  };
}

export const tiktok = upcoming("TIKTOK", "TikTok", (size) => <TikTokIcon width={size} height={size} aria-hidden="true" />);

export const googleAds = upcoming("GOOGLE_ADS", "Google Ads", (size) => <GoogleAdsIcon width={size} height={size} aria-hidden="true" />);
