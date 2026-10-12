import { Link } from "react-router-dom";
import { ArrowRightIcon } from "../../components/icons/UiIcons";
import type { Insight } from "./insights";
import "./Signals.css";

type SignalsProps = {
  insights: Insight[];
};

export function Signals({ insights }: SignalsProps) {
  if (insights.length === 0) return null;
  return (
    <section className="signals" aria-labelledby="metrics-signals">
      <h2 id="metrics-signals" className="visually-hidden">
        Señales
      </h2>
      <ul className="signals-list">
        {insights.map((insight) => (
          <li key={insight.id} className={`signal signal-${insight.tone}`}>
            <span className="signal-dot" aria-hidden="true" />
            <span className="signal-text">{insight.title}</span>
            {insight.action ? (
              <Link to={insight.action.to} className="signal-action">
                {insight.action.label}
                <ArrowRightIcon width={14} height={14} />
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
