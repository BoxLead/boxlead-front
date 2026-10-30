import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { AgentActivityDetail, AgentResponse, CategoryResponse } from "../../api/types";
import { Banner } from "../../components/ui/Banner";
import { agentActivityKey } from "../../data/agents";
import { useApiQuery } from "../../hooks/useApiQuery";
import { activityOutcomeLabel, activityReasonLabel, labeledLeadLabel, type ActivityNumbers } from "../../util/agents";
import { formatNumber, formatRelative } from "../../util/format";

const STATS = [
  { key: "labeled", label: "activity.statLabeled" },
  { key: "sent", label: "activity.statSent" },
  { key: "drafted", label: "activity.statDrafted" },
  { key: "skipped", label: "activity.statSkipped" },
  { key: "handedOff", label: "activity.statHandedOff" },
] as const satisfies readonly { key: keyof ActivityNumbers; label: string }[];

type AgentActivityProps = {
  agent: AgentResponse;
  categories: CategoryResponse[] | undefined;
  counts: ActivityNumbers | undefined;
  activityDays: number | undefined;
};

export function AgentActivity({ agent, categories, counts, activityDays }: AgentActivityProps) {
  const { t } = useTranslation("agents");
  const detail = useApiQuery<AgentActivityDetail>(agentActivityKey(agent.id));
  const days = detail.data?.days ?? activityDays ?? 30;
  const events = detail.data?.events ?? [];

  return (
    <div className="agent-activity-panel">
      {counts && activityDays ? (
        <section className="agent-stats" aria-label={t("activity.statsLabel", { name: agent.name, days: activityDays })}>
          <p className="agent-stats-period">{t("activity.period", { days: activityDays })}</p>
          <dl className="agent-stats-grid">
            {STATS.map((stat) => (
              <div key={stat.key} className="agent-stat">
                <dt>{t(stat.label)}</dt>
                <dd>{formatNumber(counts[stat.key])}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
      {detail.loading ? (
        <div className="agent-activity-skeleton" aria-hidden="true">
          {[0, 1, 2].map((index) => (
            <div key={index} className="skeleton agent-activity-row-skeleton" />
          ))}
        </div>
      ) : detail.error ? (
        <Banner
          tone="danger"
          title={t("activity.loadFailed")}
          action={
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => void detail.reload()}>
              {t("activity.retry")}
            </button>
          }
        >
          {detail.error}
        </Banner>
      ) : events.length === 0 ? (
        <p className="agent-activity-empty">{t("activity.empty", { days })}</p>
      ) : (
        <ul className="agent-activity" aria-label={t("activity.listLabel", { name: agent.name })}>
          {events.map((event) => {
            const reason = activityReasonLabel(event.reason);
            const labeled = labeledLeadLabel(event.labeledCategoryId, categories);
            return (
              <li key={event.id} className="agent-activity-item">
                <div className="agent-activity-head">
                  <span className="agent-activity-outcome">{activityOutcomeLabel(event.outcome)}</span>
                  <time dateTime={event.createdAt}>{formatRelative(event.createdAt)}</time>
                </div>
                {labeled ? <p className="agent-activity-detail">{labeled}</p> : null}
                {reason ? <p className="agent-activity-detail">{reason}</p> : null}
                {event.conversationId ? <Link to={`/app/inbox?id=${event.conversationId}`}>{t("activity.viewConversation")}</Link> : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
