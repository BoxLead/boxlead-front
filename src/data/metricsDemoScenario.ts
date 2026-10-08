import type { PlatformType } from "../api/types";

export type DayEffects = {
  volume: number;
  qualify: number;
  close: number;
  agentShare: number;
  slowTeam: boolean;
};

type DemoEvent = {
  from: number;
  to: number;
  platforms?: PlatformType[];
  peak?: number;
  decay?: number;
  qualify?: number;
  close?: number;
  agentShare?: number;
  slowTeam?: boolean;
};

const TRENDS: Partial<Record<PlatformType, number>> = {
  INSTAGRAM: 0.0042,
  WHATSAPP: 0.0018,
  MELI: 0.001,
  META: -0.0035,
};

const EVENTS: DemoEvent[] = [
  { from: 70, to: 64, peak: 0.55 },
  { from: 52, to: 50, platforms: ["MELI"], peak: 2.8, close: 1.35 },
  { from: 999, to: 46, qualify: 0.82, agentShare: 0.78 },
  { from: 33, to: 27, slowTeam: true, agentShare: 0.9 },
  { from: 18, to: 8, platforms: ["INSTAGRAM"], peak: 2.8, decay: 4, qualify: 0.7 },
  { from: 6, to: 6, platforms: ["WHATSAPP"], peak: 2.4 },
  { from: 3, to: 2, platforms: ["META"], peak: 1.8, decay: 1 },
];

function applies(event: DemoEvent, platform: PlatformType, daysAgo: number): boolean {
  if (daysAgo > event.from || daysAgo < event.to) return false;
  return !event.platforms || event.platforms.includes(platform);
}

function volumeOf(event: DemoEvent, daysAgo: number): number {
  if (event.peak === undefined) return 1;
  if (event.decay === undefined) return event.peak;
  return 1 + (event.peak - 1) * Math.exp(-(event.from - daysAgo) / event.decay);
}

export function effectsFor(platform: PlatformType, daysAgo: number, dayOfMonth: number): DayEffects {
  const effects: DayEffects = {
    volume: Math.max(0.2, 1 - (TRENDS[platform] ?? 0) * daysAgo),
    qualify: 1,
    close: dayOfMonth <= 7 ? 1.2 : dayOfMonth >= 25 ? 0.85 : 1,
    agentShare: 1,
    slowTeam: false,
  };
  for (const event of EVENTS) {
    if (!applies(event, platform, daysAgo)) continue;
    effects.volume *= volumeOf(event, daysAgo);
    effects.qualify *= event.qualify ?? 1;
    effects.close *= event.close ?? 1;
    effects.agentShare *= event.agentShare ?? 1;
    effects.slowTeam ||= event.slowTeam ?? false;
  }
  return effects;
}
