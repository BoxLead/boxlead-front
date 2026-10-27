import { useId, type ReactNode } from "react";
import { cx } from "../../../src/util/classNames";
import "./Section.css";

type SectionProps = {
  title: string;
  hint?: ReactNode;
  actions?: ReactNode;
  flush?: boolean;
  wide?: boolean;
  children: ReactNode;
};

export function Section({ title, hint, actions, flush = false, wide = false, children }: SectionProps) {
  const headingId = useId();
  return (
    <section className={cx("panel section", flush && "section-flush", wide && "section-wide")} aria-labelledby={headingId}>
      <header className="section-head">
        <div className="section-heading">
          <h2 id={headingId} className="section-title">
            {title}
          </h2>
          {hint ? <p className="section-hint">{hint}</p> : null}
        </div>
        {actions ? <div className="section-actions">{actions}</div> : null}
      </header>
      <div className="section-body">{children}</div>
    </section>
  );
}

export type Fact = { label: string; value: ReactNode };

export function Facts({ items, columns = 1 }: { items: readonly (Fact | null)[]; columns?: 1 | 2 | 3 }) {
  return (
    <dl className={cx("facts", columns > 1 && `facts-${columns}`)}>
      {items.map((item) =>
        item ? (
          <div key={item.label} className="fact">
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ) : null,
      )}
    </dl>
  );
}

export function Muted({ children }: { children: ReactNode }) {
  return <p className="muted-text">{children}</p>;
}

export function SectionGrid({ children }: { children: ReactNode }) {
  return <div className="section-grid">{children}</div>;
}
