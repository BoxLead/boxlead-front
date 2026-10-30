import i18next from "i18next";
import { ratio, type Totals } from "./metricsModel";

export type FunnelStep = {
  key: "leads" | "contacted" | "qualified";
  label: string;
  noun: string;
  value: number;
  previous: number;
  fromStart: number | null;
  fromPrevious: number | null;
  explanation: string | null;
};

function stageValues({ leads, statuses, qualified }: Totals) {
  return [leads, Math.max(leads - statuses.NEW, qualified), qualified];
}

const STAGES: FunnelStep["key"][] = ["leads", "contacted", "qualified"];

export function funnelSteps(current: Totals, previous: Totals): FunnelStep[] {
  const values = stageValues(current);
  const before = stageValues(previous);
  return STAGES.map((key, index) => ({
    key,
    label: i18next.t(`funnel.stages.${key}`, { ns: "metrics" }),
    noun: i18next.t(`funnel.stagesInSentence.${key}`, { ns: "metrics" }),
    explanation: key === "qualified" ? i18next.t("funnel.qualifiedExplanation", { ns: "metrics" }) : null,
    value: values[index],
    previous: before[index],
    fromStart: ratio(values[index], values[0]),
    fromPrevious: index === 0 ? null : ratio(values[index], values[index - 1]),
  }));
}
