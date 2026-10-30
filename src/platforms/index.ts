import type { PlatformType, SalesStage } from "../api/types";
import { channelT } from "./shared";
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
  return PLATFORMS[id].stageLabels[stage] ?? channelT()(stage === "POST_SALE" ? "channel.postSale" : "channel.messages");
}

export function hasStages(id: PlatformType): boolean {
  return Object.keys(PLATFORMS[id].stageLabels).length > 1;
}

const STAGES: SalesStage[] = ["PRE_SALE", "POST_SALE"];

function genericStageLabels(): Record<SalesStage, string> {
  const t = channelT();
  return { PRE_SALE: t("channel.preSale"), POST_SALE: t("channel.postSale") };
}

export type StageChoice = { value: SalesStage; label: string };

export function stageChoices(id: PlatformType | null): StageChoice[] {
  const generic = genericStageLabels();
  const labels: Partial<Record<SalesStage, string>> = id ? PLATFORMS[id].stageLabels : generic;
  return STAGES.filter((stage) => labels[stage] !== undefined).map((stage) => ({ value: stage, label: labels[stage] ?? generic[stage] }));
}

export type { PlatformDefinition } from "./types";
