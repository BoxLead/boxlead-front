import { useId, type ReactNode } from "react";
import "./MetricsCard.css";

type MetricsCardProps = {
  title: string;
  meta?: ReactNode;
  className?: string;
  children: ReactNode;
};

export function MetricsCard({ title, meta, className, children }: MetricsCardProps) {
  const titleId = useId();
  return (
    <section className={`m-card${className ? ` ${className}` : ""}`} aria-labelledby={titleId}>
      <header className="m-card-head">
        <h2 id={titleId} className="m-card-title">
          {title}
        </h2>
        {meta ? <div className="m-card-meta">{meta}</div> : null}
      </header>
      {children}
    </section>
  );
}
