import { ratio, type Totals } from "./metricsModel";

export type FunnelStep = {
  key: "leads" | "contacted" | "qualified";
  label: string;
  value: number;
  previous: number;
  fromStart: number | null;
  fromPrevious: number | null;
  explanation: string | null;
};

function stageValues({ leads, statuses, qualified }: Totals) {
  return [leads, Math.max(leads - statuses.NEW, qualified), qualified];
}

const STAGES: Pick<FunnelStep, "key" | "label" | "explanation">[] = [
  { key: "leads", label: "Leads", explanation: null },
  { key: "contacted", label: "Contactados", explanation: null },
  { key: "qualified", label: "Calificados", explanation: "Tibio o Caliente, o marcados como calificados" },
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
