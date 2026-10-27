import { useId, type ReactNode } from "react";
import { Banner } from "../../../../src/components/ui/Banner";
import "./customers.css";

export type Fact = { label: string; value: ReactNode };

export function Facts({ items }: { items: readonly (Fact | null)[] }) {
  return (
    <dl className="facts">
      {items.map((item) =>
        item ? (
          <div key={item.label} className="facts-row">
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ) : null,
      )}
    </dl>
  );
}

type SectionProps = {
  title: string;
  hint?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function Section({ title, hint, actions, children }: SectionProps) {
  const headingId = useId();
  return (
    <section className="panel customer-section" aria-labelledby={headingId}>
      <header className="customer-section-head">
        <div>
          <h2 id={headingId} className="customer-section-title">
            {title}
          </h2>
          {hint ? <p className="customer-section-hint">{hint}</p> : null}
        </div>
        {actions ? <div className="customer-section-actions">{actions}</div> : null}
      </header>
      {children}
    </section>
  );
}

export function Muted({ children }: { children: ReactNode }) {
  return <p className="customer-muted">{children}</p>;
}

export function LoadingBlock({ rows = 4 }: { rows?: number }) {
  return (
    <div className="customer-loading" role="status">
      {Array.from({ length: rows }, (_, index) => (
        <span key={index} className="skeleton customer-skeleton" />
      ))}
      <span className="visually-hidden">Cargando…</span>
    </div>
  );
}

export function ErrorBlock({ title, message, onRetry }: { title: string; message: string; onRetry: () => void }) {
  return (
    <Banner
      tone="danger"
      title={title}
      action={
        <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}>
          Reintentar
        </button>
      }
    >
      {message}
    </Banner>
  );
}
