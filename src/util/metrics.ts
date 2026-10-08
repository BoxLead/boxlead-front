import type { AgentMetrics, BusinessHours, FirstResponseMetrics, HandoffReason, LeadStatus } from "../api/types";

export const RESPONSE_LIMITS = [60, 300, 900, 3600, 14_400, 86_400, 172_800];

export const FAST_RESPONSE_BUCKETS = 2;

export const HOURS_PER_WEEK = 168;

export const HANDOFF_REASONS: HandoffReason[] = ["ASKED_FOR_HUMAN", "AGENT_UNSURE", "TAKEN_OVER"];

export const WEEKDAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
export const WEEKDAYS_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export const PERIODS = [7, 30, 90] as const;
export type MetricsPeriod = (typeof PERIODS)[number];

export function isWithinBusinessHours(hours: BusinessHours, weekday: number, hour: number): boolean {
  return hours.weekdays.includes(weekday) && hour >= hours.from && hour < hours.to;
}

export function emptyStatuses(): Record<LeadStatus, number> {
  return { NEW: 0, CONTACTED: 0, QUALIFIED: 0, LOST: 0, CLOSED: 0 };
}

export function emptyFirstResponse(): FirstResponseMetrics {
  const buckets = () => RESPONSE_LIMITS.map(() => 0);
  return { agent: buckets(), human: buckets(), converted: buckets(), unanswered: 0 };
}

export function emptyAgent(): AgentMetrics {
  return { resolved: 0, handoffs: { ASKED_FOR_HUMAN: 0, AGENT_UNSURE: 0, TAKEN_OVER: 0 } };
}

export function emptyWeek(): number[] {
  return Array.from({ length: HOURS_PER_WEEK }, () => 0);
}
