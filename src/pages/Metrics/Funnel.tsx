import { formatNumber, formatPercent } from "../../util/format";
import { Meter } from "./charts/Meter";
import { funnelSteps, ratio } from "./metricsModel";
import { MetricsSection } from "./MetricsSection";
import type { MetricsView } from "./useMetricsView";
import "./Funnel.css";

type FunnelProps = {
  view: MetricsView;
};

export function Funnel({ view }: FunnelProps) {
  const steps = funnelSteps(view.totals);
  const worst = steps
    .slice(1)
    .filter((step) => step.fromPrevious !== null)
    .sort((a, b) => (a.fromPrevious ?? 1) - (b.fromPrevious ?? 1))[0];
  const lost = view.totals.statuses.LOST;
  const previousStep = worst ? steps[steps.indexOf(worst) - 1] : null;

  return (
    <MetricsSection
      title="Embudo de conversión"
      takeaway={
        worst && previousStep ? (
          <>
            La etapa con más caída es de <strong>{previousStep.label.toLowerCase()}</strong> a{" "}
            <strong>{worst.label.toLowerCase()}</strong>. Solo pasa el {formatPercent(worst.fromPrevious)}.
          </>
        ) : null
      }
    >
      <ol className="funnel">
        {steps.map((step, index) => (
          <li key={step.key} className={`funnel-step funnel-step-${index}`}>
            <div className="funnel-step-head">
              <span className="funnel-step-label">{step.label}</span>
              <span className="funnel-step-value">{formatNumber(step.value)}</span>
            </div>
            <Meter value={step.fromStart} size="md" />
            <div className="funnel-step-foot">
              <span>{index === 0 ? "Todos los leads del período" : `${formatPercent(step.fromStart)} del total`}</span>
              {step.fromPrevious !== null ? (
                <span className="funnel-step-pass">
                  <span aria-hidden="true">↳ </span>
                  {formatPercent(step.fromPrevious)} pasó de la etapa anterior
                </span>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
      <p className="funnel-lost">
        <span className="funnel-lost-value">{formatNumber(lost)}</span> leads perdidos (
        {formatPercent(ratio(lost, view.totals.leads))}) y <span className="funnel-lost-value">{formatNumber(view.totals.statuses.NEW)}</span>{" "}
        todavía sin contactar.
      </p>
    </MetricsSection>
  );
}
