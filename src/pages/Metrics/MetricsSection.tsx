import { useId, type ReactNode } from "react";
import "./MetricsSection.css";

type MetricsSectionProps = {
  title: string;
  takeaway?: ReactNode;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
};

export function MetricsSection({ title, takeaway, actions, className, children }: MetricsSectionProps) {
  const titleId = useId();
  return (
    <section className={`panel metrics-section${className ? ` ${className}` : ""}`} aria-labelledby={titleId}>
      <header className="metrics-section-head">
        <div className="metrics-section-titles">
          <h2 id={titleId} className="metrics-section-title">
            {title}
          </h2>
          {takeaway ? <p className="metrics-section-takeaway">{takeaway}</p> : null}
        </div>
        {actions ? <div className="metrics-section-actions">{actions}</div> : null}
      </header>
      {children}
    </section>
  );
}
