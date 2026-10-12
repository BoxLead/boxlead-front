import type { PlaygroundResult } from "../../api/types";
import { Tag } from "../../components/ui/Tag";
import { REPLY_MODE_LABELS, describeChannelRules } from "../../util/agents";

type PlaygroundResultViewProps = {
  result: PlaygroundResult;
  saved: boolean;
};

function modeText(result: PlaygroundResult, saved: boolean): string {
  if (!saved) return "Guardá el agente para ver el modo que aplicaría.";
  if (result.replyMode === null) return "Este agente no respondería esta combinación en producción.";
  return `En producción respondería en modo ${REPLY_MODE_LABELS[result.replyMode].toLowerCase()}.`;
}

export function PlaygroundResultView({ result, saved }: PlaygroundResultViewProps) {
  const replies = result.decision === "REPLY";
  return (
    <section className="playground-result" aria-label="Resultado de la prueba">
      <div className="playground-result-head">
        <Tag tone={replies ? "success" : "warning"}>
          {replies ? "El agente respondería" : "El agente derivaría a una persona"}
        </Tag>
        <p className="playground-result-mode">{modeText(result, saved)}</p>
      </div>
      {result.reason ? <p className="playground-result-reason">Motivo: {result.reason}</p> : null}
      {result.violations.length > 0 ? (
        <div className="playground-violations">
          <p className="playground-result-title">Reglas del canal que no se cumplieron</p>
          <ul>
            {result.violations.map((violation) => (
              <li key={violation}>{violation}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <details className="playground-rules">
        <summary>Reglas del canal que aplicó</summary>
        <dl>
          {describeChannelRules(result.channelRules).map((line) => (
            <div key={line.label} className="playground-rule">
              <dt>{line.label}</dt>
              <dd>{line.value}</dd>
            </div>
          ))}
        </dl>
        {result.channelRules.guidelines.length > 0 ? (
          <ul className="playground-guidelines">
            {result.channelRules.guidelines.map((guideline) => (
              <li key={guideline}>{guideline}</li>
            ))}
          </ul>
        ) : null}
      </details>
    </section>
  );
}
