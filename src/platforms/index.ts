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

const GENERIC_STAGE_LABELS: Record<SalesStage, string> = { PRE_SALE: "Preventa", POST_SALE: "Postventa" };

export type StageChoice = { value: SalesStage; label: string };

export function stageChoices(id: PlatformType | null): StageChoice[] {
  const labels: Partial<Record<SalesStage, string>> = id ? PLATFORMS[id].stageLabels : GENERIC_STAGE_LABELS;
  return (Object.keys(GENERIC_STAGE_LABELS) as SalesStage[])
    .filter((stage) => labels[stage] !== undefined)
    .map((stage) => ({ value: stage, label: labels[stage] ?? GENERIC_STAGE_LABELS[stage] }));
}

export type { PlatformDefinition } from "./types";
