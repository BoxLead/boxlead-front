import type {
  BusinessHours,
  LeadResponse,
  LeadStatus,
  MessageResponse,
  MetricsDay,
  MetricsReport,
  MetricsSegment,
  MetricsSettings,
  PlatformType,
} from "../../src/api/types.ts";
import type { MockState } from "./fixtures.ts";

export const MAX_RANGE_DAYS = 184;

const RESPONSE_LIMITS_SECONDS = [60, 300, 900, 3600, 14_400, 86_400];
const BUCKETS = RESPONSE_LIMITS_SECONDS.length + 1;
const FAST_BUCKETS = 2;
const HOURS_PER_WEEK = 7 * 24;
const DAY_MS = 86_400_000;
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const PLATFORM_ORDER: PlatformType[] = ["META", "INSTAGRAM", "TIKTOK", "WHATSAPP", "GOOGLE_ADS", "MELI"];
const LEAD_STATUSES: LeadStatus[] = ["NEW", "CONTACTED", "QUALIFIED", "LOST", "CLOSED"];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type MetricsFailure = { status: 400; message: string };

type LocalTime = { date: string; weekday: number; hour: number };

type DayCounts = { leads: number; qualified: number; agentReplies: number; unanswered: number; buckets: number[] };

type Segment = {
  platform: PlatformType;
  categoryId: string | null;
  days: Map<string, DayCounts>;
  statuses: Record<LeadStatus, number>;
  agent: number[];
  human: number[];
  converted: number[];
  unanswered: number;
  inboundByHour: number[];
  outsideConversations: number;
  outsideAnsweredFast: number;
};

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timezone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timezone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
      weekday: "short",
    });
    formatters.set(timezone, formatter);
  }
  return formatter;
}

function localTime(iso: string, timezone: string): LocalTime {
  const parts = Object.fromEntries(formatterFor(timezone).formatToParts(new Date(iso)).map((p) => [p.type, p.value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    weekday: WEEKDAYS.indexOf(parts.weekday),
    hour: Number(parts.hour),
  };
}

function isKnownTimezone(timezone: string): boolean {
  try {
    formatterFor(timezone);
    return true;
  } catch {
    return false;
  }
}

function emptyBuckets(): number[] {
  return Array.from({ length: BUCKETS }, () => 0);
}

function bucketOf(seconds: number): number {
  const index = RESPONSE_LIMITS_SECONDS.findIndex((limit) => seconds <= limit);
  return index === -1 ? BUCKETS - 1 : index;
}

function isQualified(status: LeadStatus): boolean {
  return status === "QUALIFIED" || status === "CLOSED";
}

function isOutsideBusinessHours(hours: BusinessHours | null, time: LocalTime): boolean {
  return hours !== null && !(hours.weekdays.includes(time.weekday) && time.hour >= hours.from && time.hour < hours.to);
}

function segmentOf(segments: Map<string, Segment>, lead: LeadResponse): Segment {
  const key = `${lead.platform}|${lead.categoryId ?? ""}`;
  let segment = segments.get(key);
  if (!segment) {
    segment = {
      platform: lead.platform,
      categoryId: lead.categoryId ?? null,
      days: new Map(),
      statuses: { NEW: 0, CONTACTED: 0, QUALIFIED: 0, LOST: 0, CLOSED: 0 },
      agent: emptyBuckets(),
      human: emptyBuckets(),
      converted: emptyBuckets(),
      unanswered: 0,
      inboundByHour: Array.from({ length: HOURS_PER_WEEK }, () => 0),
      outsideConversations: 0,
      outsideAnsweredFast: 0,
    };
    segments.set(key, segment);
  }
  return segment;
}

function dayOf(segment: Segment, date: string): DayCounts {
  let day = segment.days.get(date);
  if (!day) {
    day = { leads: 0, qualified: 0, agentReplies: 0, unanswered: 0, buckets: emptyBuckets() };
    segment.days.set(date, day);
  }
  return day;
}

function byCreation(a: MessageResponse, b: MessageResponse): number {
  return a.createdAt.localeCompare(b.createdAt);
}

export function validateRange(from: string | null, to: string | null, timezone: string | null): MetricsFailure | null {
  if (!from || !ISO_DATE.test(from)) return { status: 400, message: "Invalid value for parameter 'from'" };
  if (!to || !ISO_DATE.test(to)) return { status: 400, message: "Invalid value for parameter 'to'" };
  if (!timezone) return { status: 400, message: "Required parameter 'timezone' is missing" };
  if (!isKnownTimezone(timezone)) return { status: 400, message: "Unknown time zone" };
  if (from > to) return { status: 400, message: "The start date is after the end date" };
  const days = Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS) + 1;
  if (days > MAX_RANGE_DAYS) return { status: 400, message: `The range cannot be longer than ${MAX_RANGE_DAYS} days` };
  return null;
}

export function buildMetricsReport(state: MockState, from: string, to: string, timezone: string): MetricsReport {
  const leads = new Map(state.leads.filter((lead) => !lead.postSaleOnly).map((lead) => [lead.id, lead]));
  const businessHours = state.metricsSettings.businessHours;
  const inRange = (date: string) => date >= from && date <= to;
  const segments = new Map<string, Segment>();

  for (const lead of leads.values()) {
    const date = localTime(lead.createdAt, timezone).date;
    if (!inRange(date)) continue;
    const segment = segmentOf(segments, lead);
    const day = dayOf(segment, date);
    day.leads += 1;
    if (isQualified(lead.status)) day.qualified += 1;
    segment.statuses[lead.status] += 1;
  }

  for (const conversation of state.conversations) {
    const lead = leads.get(conversation.leadId);
    if (!lead) continue;
    const messages = state.messages.filter((m) => m.conversationId === conversation.id).sort(byCreation);

    for (const message of messages) {
      const time = localTime(message.createdAt, timezone);
      if (!inRange(time.date)) continue;
      if (message.direction === "INBOUND") {
        segmentOf(segments, lead).inboundByHour[time.weekday * 24 + time.hour] += 1;
      } else if (message.agentName) {
        dayOf(segmentOf(segments, lead), time.date).agentReplies += 1;
      }
    }

    const firstInbound = messages.find((m) => m.direction === "INBOUND");
    const createdOn = localTime(conversation.createdAt, timezone).date;
    if (!firstInbound || !inRange(createdOn)) continue;
    const segment = segmentOf(segments, lead);
    const day = dayOf(segment, createdOn);
    const outside = isOutsideBusinessHours(businessHours, localTime(firstInbound.createdAt, timezone));
    if (outside) segment.outsideConversations += 1;
    const response = messages.find((m) => m.direction === "OUTBOUND" && m.createdAt >= firstInbound.createdAt);
    if (!response) {
      day.unanswered += 1;
      segment.unanswered += 1;
      continue;
    }
    const seconds = Math.max(0, (Date.parse(response.createdAt) - Date.parse(firstInbound.createdAt)) / 1000);
    const bucket = bucketOf(seconds);
    day.buckets[bucket] += 1;
    (response.agentName ? segment.agent : segment.human)[bucket] += 1;
    if (isQualified(lead.status)) segment.converted[bucket] += 1;
    if (outside && bucket < FAST_BUCKETS) segment.outsideAnsweredFast += 1;
  }

  const ordered = [...segments.values()].sort(
    (a, b) =>
      PLATFORM_ORDER.indexOf(a.platform) - PLATFORM_ORDER.indexOf(b.platform) ||
      (a.categoryId ?? "").localeCompare(b.categoryId ?? ""),
  );
  return { from, to, timezone, segments: ordered.map((segment) => toSegment(segment, businessHours)) };
}

function toSegment(segment: Segment, businessHours: BusinessHours | null): MetricsSegment {
  const days: MetricsDay[] = [...segment.days.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, day]) => ({
      date,
      leads: day.leads,
      qualified: day.qualified,
      agentReplies: day.agentReplies,
      responseBuckets: day.buckets,
      unanswered: day.unanswered,
    }));
  const leadStatuses = Object.fromEntries(LEAD_STATUSES.map((status) => [status, segment.statuses[status]])) as Record<
    LeadStatus,
    number
  >;
  return {
    platform: segment.platform,
    categoryId: segment.categoryId,
    days,
    leadStatuses,
    firstResponse: {
      agent: segment.agent,
      human: segment.human,
      converted: segment.converted,
      unanswered: segment.unanswered,
    },
    inboundByHour: segment.inboundByHour,
    outsideHours: businessHours
      ? { conversations: segment.outsideConversations, answeredUnder5m: segment.outsideAnsweredFast }
      : null,
    agent: null,
  };
}

function isInteger(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
}

function parseBusinessHours(value: unknown): BusinessHours | null | undefined {
  if (value === null) return null;
  if (typeof value !== "object" || value === undefined) return undefined;
  const { weekdays, from, to } = value as Record<string, unknown>;
  if (!Array.isArray(weekdays) || weekdays.length === 0 || weekdays.length > 7) return undefined;
  if (!weekdays.every((day) => isInteger(day, 0, 6)) || new Set(weekdays).size !== weekdays.length) return undefined;
  if (!isInteger(from, 0, 23) || !isInteger(to, 1, 24) || to <= from) return undefined;
  return { weekdays: weekdays as number[], from, to };
}

export function parseMetricsSettings(body: Record<string, unknown>): MetricsSettings | null {
  if (!isInteger(body.manualReplyMinutes, 1, 60)) return null;
  const businessHours = parseBusinessHours(body.businessHours ?? null);
  if (businessHours === undefined) return null;
  return { manualReplyMinutes: body.manualReplyMinutes, businessHours };
}
