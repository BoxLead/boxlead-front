import type { PlaygroundResult } from "../../api/types";
import i18next from "i18next";
import { useTranslation } from "react-i18next";
import { Tag } from "../../components/ui/Tag";
import { describeChannelRules, replyModeLabel } from "../../util/agents";

type PlaygroundResultViewProps = {
  result: PlaygroundResult;
  saved: boolean;
};

function modeText(result: PlaygroundResult, saved: boolean): string {
  if (!saved) return i18next.t("result.modeUnsaved", { ns: "agents" });
  if (result.replyMode === null) return i18next.t("result.modeNone", { ns: "agents" });
  return i18next.t("result.mode", { ns: "agents", mode: replyModeLabel(result.replyMode).toLowerCase() });
}

export function PlaygroundResultView({ result, saved }: PlaygroundResultViewProps) {
  const { t } = useTranslation("agents");
  const replies = result.decision === "REPLY";
  return (
    <section className="playground-result" aria-label={t("result.label")}>
      <div className="playground-result-head">
        <Tag tone={replies ? "success" : "warning"}>
          {replies ? t("result.wouldReply") : t("result.wouldHandOff")}
        </Tag>
        <p className="playground-result-mode">{modeText(result, saved)}</p>
      </div>
      {result.reason ? <p className="playground-result-reason">{t("result.reason", { reason: result.reason })}</p> : null}
      {result.violations.length > 0 ? (
        <div className="playground-violations">
          <p className="playground-result-title">{t("result.violations")}</p>
          <ul>
            {result.violations.map((violation) => (
              <li key={violation}>{violation}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <details className="playground-rules">
        <summary>{t("result.rules")}</summary>
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
