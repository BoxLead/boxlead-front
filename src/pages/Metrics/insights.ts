import type { PlatformType } from "../../api/types";
import { getPlatform } from "../../platforms";
import { formatNumber, formatPercent, formatTimes } from "../../util/format";
import { WEEKDAYS } from "../../util/metrics";
import {
  conversionBySpeed,
  handoffTotal,
  peakWindow,
  percentChange,
  ratio,
  UNCATEGORIZED,
  type BreakdownRow,
  type Totals,
} from "./metricsModel";

export type InsightTone = "positive" | "attention" | "info";

export type Insight = {
  id: string;
  tone: InsightTone;
  title: string;
  detail: string;
  action: { label: string; to: string } | null;
  weight: number;
};

export type InsightInput = {
  days: number;
  current: Totals;
  previous: Totals;
  channels: BreakdownRow[];
  categories: BreakdownRow[];
  categoryName: (id: string) => string;
};

const MIN_SAMPLE = 20;
const SLOW_FROM_BUCKET = 4;

function periodPhrase(days: number): string {
  return days === 7 ? "la semana anterior" : `los ${days} días anteriores`;
}

function volume({ days, current, previous }: InsightInput): Insight | null {
  const change = percentChange(current.leads, previous.leads);
  if (change === null || Math.abs(change) < 0.05) return null;
  const up = change > 0;
  return {
    id: "volume",
    tone: up ? "positive" : "attention",
    title: `Recibiste ${formatPercent(Math.abs(change))} ${up ? "más" : "menos"} leads`,
    detail: `Fueron ${formatNumber(current.leads)} contra ${formatNumber(previous.leads)} en ${periodPhrase(days)}.`,
    action: null,
    weight: 45 + Math.min(40, Math.abs(change) * 100),
  };
}

function channelQuality({ channels }: InsightInput): Insight | null {
  const eligible = channels.filter((row) => row.totals.leads >= MIN_SAMPLE && row.rates.qualification !== null);
  if (eligible.length < 2) return null;
  const leader = eligible[0];
  const best = [...eligible].sort((a, b) => (b.rates.qualification ?? 0) - (a.rates.qualification ?? 0))[0];
  if (best.id === leader.id) return null;
  const times = (best.rates.qualification ?? 0) / (leader.rates.qualification ?? 1);
  if (times < 1.3) return null;
  const bestName = getPlatform(best.id as PlatformType).name;
  const leaderName = getPlatform(leader.id as PlatformType).name;
  const total = channels.reduce((sum, row) => sum + row.totals.leads, 0);
  return {
    id: "channel-quality",
    tone: "info",
    title: `${bestName} califica ${formatTimes(times)} más que ${leaderName}`,
    detail: `${leaderName} trae el ${formatPercent(ratio(leader.totals.leads, total))} de los leads, pero en ${bestName} se califica el ${formatPercent(best.rates.qualification)} contra el ${formatPercent(leader.rates.qualification)}.`,
    action: { label: `Ver leads de ${bestName}`, to: `/app/leads?channel=${best.id}` },
    weight: 70,
  };
}

function speed({ current }: InsightInput): Insight | null {
  const result = conversionBySpeed(current.firstResponse, SLOW_FROM_BUCKET);
  if (result.fast === null || result.slow === null) return null;
  if (result.fastCount < MIN_SAMPLE || result.slowCount < MIN_SAMPLE / 2 || result.slow === 0) return null;
  const times = result.fast / result.slow;
  if (times < 1.4) return null;
  return {
    id: "speed",
    tone: "info",
    title: "Responder rápido califica más leads",
    detail: `Los que recibieron respuesta en menos de 5 minutos se calificaron ${formatTimes(times)} más que los que esperaron más de una hora (${formatPercent(result.fast)} contra ${formatPercent(result.slow)}).`,
    action: null,
    weight: 80,
  };
}

function outsideHours({ current }: InsightInput): Insight | null {
  const outside = current.outsideHours;
  const conversations = current.firstResponse.agent.concat(current.firstResponse.human).reduce((a, b) => a + b, 0) +
    current.firstResponse.unanswered;
  if (!outside || outside.conversations < 10 || conversations === 0) return null;
  const share = outside.conversations / conversations;
  const answered = ratio(outside.answeredUnder5m, outside.conversations) ?? 0;
  return {
    id: "outside-hours",
    tone: answered >= 0.8 ? "positive" : "attention",
    title: `El ${formatPercent(share)} de las consultas llega fuera de horario`,
    detail:
      answered >= 0.8
        ? `El ${formatPercent(answered)} de esas consultas tuvo respuesta en menos de 5 minutos${current.agent ? " gracias al agente" : ""}.`
        : `Solo el ${formatPercent(answered)} de esas consultas tuvo respuesta en menos de 5 minutos.`,
    action: null,
    weight: 55 + share * 20,
  };
}

function peak({ current }: InsightInput): Insight | null {
  const window = peakWindow(current.inboundByHour);
  const total = current.inboundByHour.reduce((sum, value) => sum + value, 0);
  if (!window || total < 50) return null;
  const average = (total * 3) / 168;
  const times = (window.share * total) / average;
  return {
    id: "peak",
    tone: "info",
    title: `El pico de mensajes es el ${WEEKDAYS[window.weekday].toLowerCase()} de ${window.from} a ${window.to} h`,
    detail: `En esa franja llegan ${formatTimes(times)} más mensajes que en una franja promedio. Es un buen momento para publicar y tener a alguien atento.`,
    action: null,
    weight: 40,
  };
}

function categoryGrowth({ categories, categoryName }: InsightInput): Insight | null {
  const growing = categories
    .filter((row) => row.id !== UNCATEGORIZED && row.previousLeads >= MIN_SAMPLE)
    .map((row) => ({ row, change: percentChange(row.totals.leads, row.previousLeads) ?? 0 }))
    .filter(({ change }) => change >= 0.25)
    .sort((a, b) => b.change - a.change)[0];
  if (!growing) return null;
  const name = categoryName(growing.row.id);
  return {
    id: "category-growth",
    tone: "attention",
    title: `${name} creció ${formatPercent(growing.change)}`,
    detail: `Pasó de ${formatNumber(growing.row.previousLeads)} a ${formatNumber(growing.row.totals.leads)} leads. Mirá qué los está generando.`,
    action: { label: `Ver leads de ${name}`, to: `/app/leads?category=${growing.row.id}&buyers=1` },
    weight: 45 + Math.min(30, growing.change * 20),
  };
}

function unanswered({ current }: InsightInput): Insight | null {
  const count = current.firstResponse.unanswered;
  if (count < 3) return null;
  return {
    id: "unanswered",
    tone: "attention",
    title: `${formatNumber(count)} conversaciones esperan respuesta`,
    detail: "Son leads que todavía no recibieron ningún mensaje. Cuanto más esperan, menos se califican.",
    action: { label: "Ir a la bandeja", to: "/app/inbox?unread=1" },
    weight: 100,
  };
}

function handoffs({ current }: InsightInput): Insight | null {
  if (!current.agent) return null;
  const handed = handoffTotal(current.agent);
  const total = handed + current.agent.resolved;
  const share = ratio(handed, total);
  if (share === null || total < MIN_SAMPLE) return null;
  return {
    id: "handoffs",
    tone: share > 0.25 ? "attention" : "positive",
    title: `El agente resolvió sin ayuda el ${formatPercent(1 - share)} de las conversaciones`,
    detail: `Derivó ${formatNumber(handed)} a tu equipo. Sumar respuestas al plan de ventas reduce las derivaciones.`,
    action: null,
    weight: share > 0.25 ? 65 : 35,
  };
}

const RULES = [unanswered, speed, channelQuality, outsideHours, volume, categoryGrowth, peak, handoffs];

export function buildInsights(input: InsightInput, limit = 3): Insight[] {
  return RULES.map((rule) => rule(input))
    .filter((insight): insight is Insight => insight !== null)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit);
}
