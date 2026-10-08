import type {
  AgentMetrics,
  CategoryResponse,
  FirstResponseMetrics,
  HandoffReason,
  LeadStatus,
  MetricsReport,
  MetricsSegment,
  OutsideHoursMetrics,
  PlatformType,
} from "../../api/types";
import { addDays, dateRange, weekdayIndex } from "../../util/dates";
import { FAST_RESPONSE_BUCKETS, HANDOFF_REASONS, HOURS_PER_WEEK, RESPONSE_BUCKETS } from "../../util/metrics";

export const UNCATEGORIZED = "none";

export type MetricsFilters = {
  platform: PlatformType | "ALL";
  category: string | null;
};

export type Totals = {
  leads: number;
  conversations: number;
  inboundMessages: number;
  agentReplies: number;
  humanReplies: number;
  qualified: number;
  closed: number;
  statuses: Record<LeadStatus, number>;
  firstResponse: FirstResponseMetrics;
  inboundByHour: number[];
  outsideHours: OutsideHoursMetrics | null;
  agent: AgentMetrics | null;
};

export type Rates = {
  qualification: number | null;
  close: number | null;
  win: number | null;
  fastShare: number | null;
  medianSeconds: number | null;
  answered: number;
};

export type SeriesPoint = {
  date: string;
  total: number;
  byPlatform: Partial<Record<PlatformType, number>>;
};

export function matchesFilters(segment: MetricsSegment, filters: MetricsFilters): boolean {
  if (filters.platform !== "ALL" && segment.platform !== filters.platform) return false;
  if (filters.category === UNCATEGORIZED) return segment.categoryId === null;
  if (filters.category) return segment.categoryId === filters.category;
  return true;
}

export function selectSegments(report: MetricsReport | undefined, filters: MetricsFilters): MetricsSegment[] {
  return (report?.segments ?? []).filter((segment) => matchesFilters(segment, filters));
}

function addInto(target: number[], source: number[]) {
  source.forEach((value, index) => {
    target[index] = (target[index] ?? 0) + value;
  });
}

export function emptyTotals(): Totals {
  return {
    leads: 0,
    conversations: 0,
    inboundMessages: 0,
    agentReplies: 0,
    humanReplies: 0,
    qualified: 0,
    closed: 0,
    statuses: { NEW: 0, CONTACTED: 0, QUALIFIED: 0, LOST: 0, CLOSED: 0 },
    firstResponse: {
      agent: RESPONSE_BUCKETS.map(() => 0),
      human: RESPONSE_BUCKETS.map(() => 0),
      converted: RESPONSE_BUCKETS.map(() => 0),
      unanswered: 0,
    },
    inboundByHour: Array.from({ length: HOURS_PER_WEEK }, () => 0),
    outsideHours: null,
    agent: null,
  };
}

export function sumSegments(segments: MetricsSegment[]): Totals {
  const totals = emptyTotals();
  for (const segment of segments) {
    for (const day of segment.days) {
      totals.leads += day.leads;
      totals.conversations += day.conversations;
      totals.inboundMessages += day.inboundMessages;
      totals.agentReplies += day.agentReplies;
      totals.humanReplies += day.humanReplies;
      totals.qualified += day.qualified;
      totals.closed += day.closed;
    }
    (Object.keys(totals.statuses) as LeadStatus[]).forEach((status) => {
      totals.statuses[status] += segment.leadStatuses[status] ?? 0;
    });
    addInto(totals.firstResponse.agent, segment.firstResponse.agent);
    addInto(totals.firstResponse.human, segment.firstResponse.human);
    addInto(totals.firstResponse.converted, segment.firstResponse.converted);
    totals.firstResponse.unanswered += segment.firstResponse.unanswered;
    addInto(totals.inboundByHour, segment.inboundByHour);
    if (segment.outsideHours) {
      totals.outsideHours ??= { conversations: 0, answeredUnder5m: 0 };
      totals.outsideHours.conversations += segment.outsideHours.conversations;
      totals.outsideHours.answeredUnder5m += segment.outsideHours.answeredUnder5m;
    }
    const source = segment.agent;
    if (source) {
      const agent = (totals.agent ??= { resolved: 0, handoffs: { ASKED_FOR_HUMAN: 0, AGENT_UNSURE: 0, TAKEN_OVER: 0 } });
      agent.resolved += source.resolved;
      HANDOFF_REASONS.forEach((reason) => {
        agent.handoffs[reason] += source.handoffs[reason] ?? 0;
      });
    }
  }
  return totals;
}

export function ratio(part: number, whole: number): number | null {
  return whole > 0 ? part / whole : null;
}

export function answeredBuckets(firstResponse: FirstResponseMetrics): number[] {
  return RESPONSE_BUCKETS.map((_, index) => (firstResponse.agent[index] ?? 0) + (firstResponse.human[index] ?? 0));
}

export function estimateMedianSeconds(buckets: number[]): number | null {
  const total = buckets.reduce((sum, value) => sum + value, 0);
  if (total === 0) return null;
  const half = total / 2;
  let seen = 0;
  for (let index = 0; index < buckets.length; index++) {
    const count = buckets[index];
    if (seen + count >= half && count > 0) {
      const lower = index === 0 ? 0 : RESPONSE_BUCKETS[index - 1].maxSeconds;
      const upper = RESPONSE_BUCKETS[index].maxSeconds;
      return lower + ((half - seen) / count) * (upper - lower);
    }
    seen += count;
  }
  return RESPONSE_BUCKETS[RESPONSE_BUCKETS.length - 1].maxSeconds;
}

export function rates(totals: Totals): Rates {
  const buckets = answeredBuckets(totals.firstResponse);
  const answered = buckets.reduce((sum, value) => sum + value, 0);
  const fast = buckets.slice(0, FAST_RESPONSE_BUCKETS).reduce((sum, value) => sum + value, 0);
  return {
    qualification: ratio(totals.qualified, totals.leads),
    close: ratio(totals.closed, totals.leads),
    win: ratio(totals.statuses.CLOSED, totals.statuses.CLOSED + totals.statuses.LOST),
    fastShare: ratio(fast, answered + totals.firstResponse.unanswered),
    medianSeconds: estimateMedianSeconds(buckets),
    answered,
  };
}

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return (current - previous) / previous;
}

export function dailySeries(segments: MetricsSegment[], from: string, to: string): SeriesPoint[] {
  const points = new Map<string, SeriesPoint>(
    dateRange(from, to).map((date) => [date, { date, total: 0, byPlatform: {} }]),
  );
  for (const segment of segments) {
    for (const day of segment.days) {
      const point = points.get(day.date);
      if (!point) continue;
      point.total += day.leads;
      point.byPlatform[segment.platform] = (point.byPlatform[segment.platform] ?? 0) + day.leads;
    }
  }
  return [...points.values()];
}

export function weeklySeries(daily: SeriesPoint[]): SeriesPoint[] {
  const weeks: SeriesPoint[] = [];
  const offset = daily.length % 7;
  for (let start = 0; start < daily.length; start += start === 0 && offset ? offset : 7) {
    const size = start === 0 && offset ? offset : 7;
    const chunk = daily.slice(start, start + size);
    const week: SeriesPoint = { date: chunk[0].date, total: 0, byPlatform: {} };
    for (const day of chunk) {
      week.total += day.total;
      for (const [platform, value] of Object.entries(day.byPlatform) as [PlatformType, number][]) {
        week.byPlatform[platform] = (week.byPlatform[platform] ?? 0) + value;
      }
    }
    weeks.push(week);
  }
  return weeks;
}

export type FunnelStep = {
  key: "leads" | "contacted" | "qualified" | "closed";
  label: string;
  value: number;
  fromStart: number | null;
  fromPrevious: number | null;
};

export function funnelSteps(totals: Totals): FunnelStep[] {
  const { statuses } = totals;
  const values: [FunnelStep["key"], string, number][] = [
    ["leads", "Leads", totals.leads],
    ["contacted", "Contactados", totals.leads - statuses.NEW],
    ["qualified", "Calificados", statuses.QUALIFIED + statuses.CLOSED],
    ["closed", "Ventas", statuses.CLOSED],
  ];
  return values.map(([key, label, value], index) => ({
    key,
    label,
    value,
    fromStart: ratio(value, totals.leads),
    fromPrevious: index === 0 ? null : ratio(value, values[index - 1][2]),
  }));
}

export type BreakdownRow = {
  id: string;
  totals: Totals;
  previousLeads: number;
  rates: Rates;
};

function groupBy(
  segments: MetricsSegment[],
  keyOf: (segment: MetricsSegment) => string,
): Map<string, MetricsSegment[]> {
  const groups = new Map<string, MetricsSegment[]>();
  for (const segment of segments) {
    const key = keyOf(segment);
    groups.set(key, [...(groups.get(key) ?? []), segment]);
  }
  return groups;
}

function breakdown(
  current: MetricsSegment[],
  previous: MetricsSegment[],
  keyOf: (segment: MetricsSegment) => string,
): BreakdownRow[] {
  const now = groupBy(current, keyOf);
  const before = groupBy(previous, keyOf);
  return [...now.entries()]
    .map(([id, segments]) => {
      const totals = sumSegments(segments);
      return {
        id,
        totals,
        previousLeads: sumSegments(before.get(id) ?? []).leads,
        rates: rates(totals),
      };
    })
    .filter((row) => row.totals.leads > 0)
    .sort((a, b) => b.totals.leads - a.totals.leads);
}

export function channelBreakdown(current: MetricsSegment[], previous: MetricsSegment[]): BreakdownRow[] {
  return breakdown(current, previous, (segment) => segment.platform);
}

export function categoryBreakdown(
  current: MetricsSegment[],
  previous: MetricsSegment[],
  categories: CategoryResponse[],
): BreakdownRow[] {
  const known = new Set(categories.map((category) => category.id));
  return breakdown(current, previous, (segment) =>
    segment.categoryId && known.has(segment.categoryId) ? segment.categoryId : UNCATEGORIZED,
  );
}

export type SpeedRow = {
  index: number;
  agent: number;
  human: number;
  conversion: number | null;
};

export function speedRows(firstResponse: FirstResponseMetrics): SpeedRow[] {
  return RESPONSE_BUCKETS.map((_, index) => {
    const agent = firstResponse.agent[index] ?? 0;
    const human = firstResponse.human[index] ?? 0;
    return { index, agent, human, conversion: ratio(firstResponse.converted[index] ?? 0, agent + human) };
  });
}

export function conversionBySpeed(firstResponse: FirstResponseMetrics, splitAt: number) {
  const rows = speedRows(firstResponse);
  const sum = (list: SpeedRow[]) =>
    list.reduce(
      (acc, row) => ({
        answered: acc.answered + row.agent + row.human,
        converted: acc.converted + (firstResponse.converted[row.index] ?? 0),
      }),
      { answered: 0, converted: 0 },
    );
  const fast = sum(rows.slice(0, FAST_RESPONSE_BUCKETS));
  const slow = sum(rows.slice(splitAt));
  return {
    fast: ratio(fast.converted, fast.answered),
    slow: ratio(slow.converted, slow.answered),
    fastCount: fast.answered,
    slowCount: slow.answered,
  };
}

export type PeakWindow = {
  weekday: number;
  from: number;
  to: number;
  share: number;
};

export function peakWindow(hourly: number[], width = 3): PeakWindow | null {
  const total = hourly.reduce((sum, value) => sum + value, 0);
  if (total === 0) return null;
  let best: PeakWindow | null = null;
  let bestValue = -1;
  for (let weekday = 0; weekday < 7; weekday++) {
    for (let hour = 0; hour <= 24 - width; hour++) {
      let value = 0;
      for (let offset = 0; offset < width; offset++) value += hourly[weekday * 24 + hour + offset] ?? 0;
      if (value > bestValue) {
        bestValue = value;
        best = { weekday, from: hour, to: hour + width, share: value / total };
      }
    }
  }
  return best;
}

export function heatLevels(hourly: number[], levels = 6): number[] {
  const max = Math.max(0, ...hourly);
  if (max === 0) return hourly.map(() => 0);
  return hourly.map((value) => (value === 0 ? 0 : Math.max(1, Math.ceil((value / max) * levels))));
}

export function busiestWeekday(daily: SeriesPoint[]): { weekday: number; average: number } | null {
  const sums = Array.from({ length: 7 }, () => ({ total: 0, days: 0 }));
  for (const point of daily) {
    const index = weekdayIndex(point.date);
    sums[index].total += point.total;
    sums[index].days += 1;
  }
  let best: { weekday: number; average: number } | null = null;
  sums.forEach((entry, weekday) => {
    if (entry.days === 0) return;
    const average = entry.total / entry.days;
    if (!best || average > best.average) best = { weekday, average };
  });
  return best;
}

export function handoffTotal(agent: AgentMetrics | null): number {
  if (!agent) return 0;
  return HANDOFF_REASONS.reduce((sum, reason: HandoffReason) => sum + agent.handoffs[reason], 0);
}

export function periodRange(days: number, today: string) {
  const to = today;
  const from = addDays(today, -(days - 1));
  return { from, to, previousFrom: addDays(from, -days), previousTo: addDays(from, -1) };
}

export type SpeedBand = {
  label: string;
  answered: number;
  converted: number;
  rate: number | null;
};

const SPEED_BANDS: { label: string; from: number; to: number }[] = [
  { label: "Menos de 5 minutos", from: 0, to: FAST_RESPONSE_BUCKETS },
  { label: "De 5 a 60 minutos", from: FAST_RESPONSE_BUCKETS, to: 4 },
  { label: "Más de 1 hora", from: 4, to: RESPONSE_BUCKETS.length },
];

export function speedBands(firstResponse: FirstResponseMetrics): SpeedBand[] {
  const answered = answeredBuckets(firstResponse);
  return SPEED_BANDS.map((band) => {
    let total = 0;
    let converted = 0;
    for (let index = band.from; index < band.to; index++) {
      total += answered[index] ?? 0;
      converted += firstResponse.converted[index] ?? 0;
    }
    return { label: band.label, answered: total, converted, rate: ratio(converted, total) };
  });
}
