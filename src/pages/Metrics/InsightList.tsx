import { Link } from "react-router-dom";
import { AlertIcon, ArrowRightIcon, CheckIcon, SparkIcon } from "../../components/icons/UiIcons";
import type { Insight } from "./insights";
import "./InsightList.css";

const ICONS = {
  positive: <CheckIcon width={18} height={18} />,
  attention: <AlertIcon width={18} height={18} />,
  info: <SparkIcon width={18} height={18} />,
};

type InsightListProps = {
  insights: Insight[];
};

export function InsightList({ insights }: InsightListProps) {
  if (insights.length === 0) return null;
  return (
    <section className="insights" aria-labelledby="metrics-insights-title">
      <h2 className="panel-title" id="metrics-insights-title">
        Lo que tenés que saber
      </h2>
      <ul className="insight-list">
        {insights.map((insight) => (
          <li key={insight.id} className={`insight insight-${insight.tone}`}>
            <span className="insight-icon">{ICONS[insight.tone]}</span>
            <h3 className="insight-title">{insight.title}</h3>
            <p className="insight-detail">{insight.detail}</p>
            {insight.action ? (
              <Link to={insight.action.to} className="insight-action">
                {insight.action.label}
                <ArrowRightIcon width={16} height={16} />
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
