import type {
  AgentMetrics,
  FirstResponseMetrics,
  LeadStatus,
  MetricsReport,
  MetricsSegment,
  OutsideHoursMetrics,
  PlatformType,
} from "../../api/types";
import { UNCATEGORIZED } from "../../util/categories";
import { addDays } from "../../util/dates";
import {
  emptyAgent,
  emptyFirstResponse,
  emptyStatuses,
  emptyWeek,
  FAST_RESPONSE_BUCKETS,
  HANDOFF_REASONS,
  RESPONSE_LIMITS,
} from "../../util/metrics";

export type MetricsFilters = {
  platform: PlatformType | "ALL";
  category: string | null;
};

export type Totals = {
  leads: number;
  agentReplies: number;
  humanReplies: number;
  qualified: number;
  statuses: Record<LeadStatus, number>;
  firstResponse: FirstResponseMetrics;
  inboundByHour: number[];
  outsideHours: OutsideHoursMetrics | null;
  agent: AgentMetrics | null;
};

export function selectSegments(report: MetricsReport | undefined, filters: MetricsFilters): MetricsSegment[] {
  return (report?.segments ?? []).filter((segment) => {
    if (filters.platform !== "ALL" && segment.platform !== filters.platform) return false;
    if (filters.category === UNCATEGORIZED) return segment.categoryId === null;
    return !filters.category || segment.categoryId === filters.category;
  });
}

function addInto(target: number[], source: number[]) {
  source.forEach((value, index) => {
    target[index] = (target[index] ?? 0) + value;
  });
}

export function emptyTotals(): Totals {
  return {
    leads: 0,
    agentReplies: 0,
    humanReplies: 0,
    qualified: 0,
    statuses: emptyStatuses(),
    firstResponse: emptyFirstResponse(),
    inboundByHour: emptyWeek(),
    outsideHours: null,
    agent: null,
  };
}

export function sumSegments(segments: MetricsSegment[]): Totals {
  const totals = emptyTotals();
  for (const segment of segments) {
    for (const day of segment.days) {
      totals.leads += day.leads;
      totals.agentReplies += day.agentReplies;
      totals.humanReplies += day.humanReplies;
      totals.qualified += day.qualified;
    }
    for (const status of Object.keys(totals.statuses) as LeadStatus[]) {
      totals.statuses[status] += segment.leadStatuses[status] ?? 0;
    }
    addInto(totals.firstResponse.agent, segment.firstResponse.agent);
    addInto(totals.firstResponse.human, segment.firstResponse.human);
    addInto(totals.firstResponse.converted, segment.firstResponse.converted);
    totals.firstResponse.unanswered += segment.firstResponse.unanswered;
    addInto(totals.inboundByHour, segment.inboundByHour);
    if (segment.outsideHours) {
      const outside = (totals.outsideHours ??= { conversations: 0, answeredUnder5m: 0 });
      outside.conversations += segment.outsideHours.conversations;
      outside.answeredUnder5m += segment.outsideHours.answeredUnder5m;
    }
    if (segment.agent) {
      const agent = (totals.agent ??= emptyAgent());
      agent.resolved += segment.agent.resolved;
      for (const reason of HANDOFF_REASONS) agent.handoffs[reason] += segment.agent.handoffs[reason] ?? 0;
    }
  }
  return totals;
}

export function ratio(part: number, whole: number): number | null {
  return whole > 0 ? part / whole : null;
}

export function percentChange(current: number, previous: number): number | null {
  return previous === 0 ? null : (current - previous) / previous;
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export function answeredBuckets({ agent, human }: FirstResponseMetrics): number[] {
  return RESPONSE_LIMITS.map((_, index) => (agent[index] ?? 0) + (human[index] ?? 0));
}

export function estimateMedianSeconds(buckets: number[]): number | null {
  const half = sum(buckets) / 2;
  if (half === 0) return null;
  let seen = 0;
  for (let index = 0; index < buckets.length; index++) {
    const count = buckets[index];
    if (count > 0 && seen + count >= half) {
      const lower = index === 0 ? 0 : RESPONSE_LIMITS[index - 1];
      return lower + ((half - seen) / count) * (RESPONSE_LIMITS[index] - lower);
    }
    seen += count;
  }
  return RESPONSE_LIMITS[RESPONSE_LIMITS.length - 1];
}

export function qualificationRate(totals: Totals): number | null {
  return ratio(totals.qualified, totals.leads);
}

export function conversionBySpeed(firstResponse: FirstResponseMetrics, slowFrom: number) {
  const answered = answeredBuckets(firstResponse);
  const band = (from: number, to: number) => ({
    answered: sum(answered.slice(from, to)),
    converted: sum(firstResponse.converted.slice(from, to)),
  });
  const fast = band(0, FAST_RESPONSE_BUCKETS);
  const slow = band(slowFrom, RESPONSE_LIMITS.length);
  return {
    fast: ratio(fast.converted, fast.answered),
    slow: ratio(slow.converted, slow.answered),
    fastCount: fast.answered,
    slowCount: slow.answered,
  };
}

export function handoffTotal(agent: AgentMetrics | null): number {
  return agent ? sum(HANDOFF_REASONS.map((reason) => agent.handoffs[reason])) : 0;
}

export function periodRange(days: number, today: string) {
  const from = addDays(today, -(days - 1));
  return { from, to: today, previousFrom: addDays(from, -days), previousTo: addDays(from, -1) };
}
