import type { PlatformType } from "../../api/types";
import { getPlatform } from "../../platforms";
import { formatNumber, formatPercent } from "../../util/format";
import { UNCATEGORIZED } from "../../util/categories";
import type { BreakdownRow } from "./breakdown";
import { conversionBySpeed, percentChange, ratio, type Totals } from "./metricsModel";

export type InsightTone = "positive" | "attention" | "info";

export type Insight = {
  id: string;
  tone: InsightTone;
  title: string;
  action: { label: string; to: string } | null;
  weight: number;
};

export type InsightInput = {
  current: Totals;
  channels: BreakdownRow[];
  categories: BreakdownRow[];
  categoryName: (id: string) => string;
};

const MIN_SAMPLE = 20;
const SLOW_FROM_BUCKET = 4;

function times(value: number): string {
  return `${value.toLocaleString("es-AR", { maximumFractionDigits: 1, minimumFractionDigits: value < 10 ? 1 : 0 })}×`;
}

function unanswered({ current }: InsightInput): Insight | null {
  const count = current.firstResponse.unanswered;
  if (count < 3) return null;
  return {
    id: "unanswered",
    tone: "attention",
    title: `${formatNumber(count)} conversaciones sin respuesta`,
    action: { label: "Responder", to: "/app/inbox?unread=1" },
    weight: 100,
  };
}

function speed({ current }: InsightInput): Insight | null {
  const result = conversionBySpeed(current.firstResponse, SLOW_FROM_BUCKET);
  if (result.fast === null || result.slow === null || result.slow === 0) return null;
  if (result.fastCount < MIN_SAMPLE || result.slowCount < MIN_SAMPLE) return null;
  const factor = result.fast / result.slow;
  if (factor < 1.4) return null;
  return {
    id: "speed",
    tone: "info",
    title: `Responder en menos de 5 min califica ${times(factor)} más`,
    action: null,
    weight: 80,
  };
}

function channelQuality({ channels }: InsightInput): Insight | null {
  const eligible = channels.filter((row) => row.totals.leads >= MIN_SAMPLE && row.qualification !== null);
  if (eligible.length < 2) return null;
  const leader = eligible[0];
  const best = [...eligible].sort((a, b) => (b.qualification ?? 0) - (a.qualification ?? 0))[0];
  if (best.id === leader.id) return null;
  const factor = (best.qualification ?? 0) / (leader.qualification ?? 1);
  if (factor < 1.3) return null;
  const bestName = getPlatform(best.id as PlatformType).name;
  return {
    id: "channel-quality",
    tone: "info",
    title: `${bestName} califica ${times(factor)} más que ${getPlatform(leader.id as PlatformType).name}`,
    action: { label: "Ver leads", to: `/app/leads?channel=${best.id}` },
    weight: 70,
  };
}

function outsideHours({ current }: InsightInput): Insight | null {
  const outside = current.outsideHours;
  const conversations =
    current.firstResponse.agent.concat(current.firstResponse.human).reduce((a, b) => a + b, 0) +
    current.firstResponse.unanswered;
  if (!outside || outside.conversations < MIN_SAMPLE || conversations === 0) return null;
  const answered = ratio(outside.answeredUnder5m, outside.conversations) ?? 0;
  return {
    id: "outside-hours",
    tone: answered >= 0.8 ? "positive" : "attention",
    title: `${formatPercent(outside.conversations / conversations)} de las consultas llega fuera de horario`,
    action: null,
    weight: 55 + (outside.conversations / conversations) * 20,
  };
}

function categoryGrowth({ categories, categoryName }: InsightInput): Insight | null {
  const growing = categories
    .filter((row) => row.id !== UNCATEGORIZED && row.previousLeads >= MIN_SAMPLE)
    .map((row) => ({ row, change: percentChange(row.totals.leads, row.previousLeads) ?? 0 }))
    .filter(({ change }) => change >= 0.25)
    .sort((a, b) => b.change - a.change)[0];
  if (!growing) return null;
  return {
    id: "category-growth",
    tone: "attention",
    title: `${categoryName(growing.row.id)} creció ${formatPercent(growing.change)}`,
    action: { label: "Ver leads", to: `/app/leads?category=${growing.row.id}&buyers=1` },
    weight: 45 + Math.min(30, growing.change * 20),
  };
}

const RULES = [unanswered, speed, channelQuality, outsideHours, categoryGrowth];

export function buildInsights(input: InsightInput, limit = 3): Insight[] {
  return RULES.map((rule) => rule(input))
    .filter((insight): insight is Insight => insight !== null)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit);
}
