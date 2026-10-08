import type { CategoryResponse, MetricsSegment } from "../../api/types";
import { UNCATEGORIZED } from "../../util/categories";
import { qualificationRate, ratio, sumSegments, type Totals } from "./metricsModel";

export type BreakdownRow = {
  id: string;
  totals: Totals;
  previousLeads: number;
  qualification: number | null;
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

export type FunnelStep = {
  key: "leads" | "contacted" | "qualified";
  label: string;
  value: number;
  previous: number;
  fromStart: number | null;
  fromPrevious: number | null;
};

function stageValues({ leads, statuses }: Totals) {
  return [leads, leads - statuses.NEW, statuses.QUALIFIED + statuses.CLOSED];
}

const STAGES: Pick<FunnelStep, "key" | "label">[] = [
  { key: "leads", label: "Leads" },
  { key: "contacted", label: "Contactados" },
  { key: "qualified", label: "Calificados" },
];

export function funnelSteps(current: Totals, previous: Totals): FunnelStep[] {
  const values = stageValues(current);
  const before = stageValues(previous);
  return STAGES.map((stage, index) => ({
    ...stage,
    value: values[index],
    previous: before[index],
    fromStart: ratio(values[index], values[0]),
    fromPrevious: index === 0 ? null : ratio(values[index], values[index - 1]),
  }));
}
