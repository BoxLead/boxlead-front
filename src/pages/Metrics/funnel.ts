import { ratio, type Totals } from "./metricsModel";

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
