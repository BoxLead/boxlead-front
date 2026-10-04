import type { PlatformType, SalesStage } from "../api/types";
import { instagram } from "./instagram";
import { meli } from "./meli";
import { messenger } from "./messenger";
import type { PlatformDefinition } from "./types";
import { googleAds, tiktok } from "./upcoming";
import { whatsapp } from "./whatsapp";

const PLATFORMS: Record<PlatformType, PlatformDefinition> = {
  MELI: meli,
  WHATSAPP: whatsapp,
  INSTAGRAM: instagram,
  META: messenger,
  TIKTOK: tiktok,
  GOOGLE_ADS: googleAds,
};

export const CONNECTABLE_PLATFORMS: PlatformDefinition[] = [meli, whatsapp, instagram, messenger];

export function getPlatform(id: PlatformType): PlatformDefinition {
  return PLATFORMS[id];
}

export function stageLabel(id: PlatformType, stage: SalesStage): string {
  return PLATFORMS[id].stageLabels[stage] ?? (stage === "POST_SALE" ? "Postventa" : "Mensajes");
}

export function hasStages(id: PlatformType): boolean {
  return Object.keys(PLATFORMS[id].stageLabels).length > 1;
}

export type { PlatformDefinition } from "./types";
