import type { MetricsSegment } from "../../api/types";
import {
  answeredBuckets,
  categoryKey,
  estimateMedianSeconds,
  qualificationRate,
  sumSegments,
  type KnownCategories,
  type Totals,
} from "./metricsModel";

export type BreakdownRow = {
  id: string;
  totals: Totals;
  previousLeads: number;
  qualification: number | null;
  medianResponse: number | null;
};

function groupBy(segments: MetricsSegment[], keyOf: (segment: MetricsSegment) => string) {
  const groups = new Map<string, MetricsSegment[]>();
  for (const segment of segments) {
    const key = keyOf(segment);
    const group = groups.get(key);
    if (group) group.push(segment);
    else groups.set(key, [segment]);
  }
  return groups;
}

function breakdown(current: MetricsSegment[], previous: MetricsSegment[], keyOf: (segment: MetricsSegment) => string) {
  const before = groupBy(previous, keyOf);
  return [...groupBy(current, keyOf)]
    .map(([id, segments]): BreakdownRow => {
      const totals = sumSegments(segments);
      return {
        id,
        totals,
        previousLeads: sumSegments(before.get(id) ?? []).leads,
        qualification: qualificationRate(totals),
        medianResponse: estimateMedianSeconds(answeredBuckets(totals.firstResponse)),
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
  known: KnownCategories,
): BreakdownRow[] {
  return breakdown(current, previous, (segment) => categoryKey(segment, known));
}
