import type { BusinessHours, HandoffReason } from "../api/types";

export type ResponseBucket = {
  label: string;
  short: string;
  maxSeconds: number;
};

export const RESPONSE_BUCKETS: ResponseBucket[] = [
  { label: "Menos de 1 minuto", short: "< 1 min", maxSeconds: 60 },
  { label: "De 1 a 5 minutos", short: "1-5 min", maxSeconds: 300 },
  { label: "De 5 a 15 minutos", short: "5-15 min", maxSeconds: 900 },
  { label: "De 15 a 60 minutos", short: "15-60 min", maxSeconds: 3600 },
  { label: "De 1 a 4 horas", short: "1-4 h", maxSeconds: 14_400 },
  { label: "De 4 a 24 horas", short: "4-24 h", maxSeconds: 86_400 },
  { label: "Más de 24 horas", short: "+24 h", maxSeconds: 172_800 },
];

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
