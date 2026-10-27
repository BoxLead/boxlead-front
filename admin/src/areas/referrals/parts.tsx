import { useId, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "../../../../src/components/EmptyState/EmptyState";
import { Banner } from "../../../../src/components/ui/Banner";
import { Tag, type TagTone } from "../../../../src/components/ui/Tag";
import type { DetailResult } from "./hooks";
import "./referrals.css";

export function StatusTag({ value }: { value: { label: string; tone: TagTone } }) {
  return <Tag tone={value.tone}>{value.label}</Tag>;
}

type DetailStateProps<T> = {
  query: DetailResult<T> & { reload: () => void };
  notFound: string;
  back: { to: string; label: string };
  children: (data: T) => ReactNode;
};

export function DetailState<T>({ query, notFound, back, children }: DetailStateProps<T>) {
  if (query.status === "loading") {
    return (
      <div className="ref-loading" role="status">
        <span className="skeleton ref-skeleton-title" />
        <span className="skeleton ref-skeleton-block" />
        <span className="skeleton ref-skeleton-block" />
        <span className="visually-hidden">Cargando…</span>
      </div>
    );
  }
  if (query.status === "error") {
    if (query.notFound) {
      return (
        <div className="panel">
          <EmptyState
            illustration="missing"
            title={notFound}
            hint="Puede que el enlace esté mal o que ya no exista."
            action={
              <Link className="btn btn-secondary" to={back.to}>
                Volver a {back.label}
              </Link>
            }
          />
        </div>
      );
    }
    return (
      <Banner
        tone="danger"
        title="No pudimos cargar esta pantalla"
        action={
          <button type="button" className="btn btn-secondary btn-sm" onClick={query.reload}>
            Reintentar
          </button>
        }
      >
        {query.message}
      </Banner>
    );
  }
  return <>{children(query.data)}</>;
}

export function Facts({ children }: { children: ReactNode }) {
  return <dl className="ref-facts">{children}</dl>;
}

export function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="ref-fact">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export function Section({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  const id = useId();
  return (
    <section className="panel ref-section" aria-labelledby={id}>
      <header className="ref-section-head">
        <h2 id={id} className="ref-section-title">
          {title}
        </h2>
        {actions ? <div className="ref-section-actions">{actions}</div> : null}
      </header>
      <div className="ref-section-body">{children}</div>
    </section>
  );
}

export function FinanceOnly({ what }: { what: string }) {
  return <p className="ref-restricted">{what} los ve solo Finanzas.</p>;
}

type TextFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  help?: string;
  type?: "text" | "date";
  optional?: boolean;
  maxLength?: number;
  autoComplete?: string;
};

export function TextField({ label, value, onChange, error, help, type = "text", optional, maxLength, autoComplete = "off" }: TextFieldProps) {
  const id = useId();
  const helpId = useId();
  const message = error ?? help;
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
        {optional ? <span className="ref-optional"> (opcional)</span> : null}
      </label>
      <input
        id={id}
        className="input"
        type={type}
        value={value}
        maxLength={maxLength}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? helpId : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {message ? (
        <span id={helpId} className={error ? "field-error" : "field-help"}>
          {message}
        </span>
      ) : null}
    </div>
  );
}

type SelectFieldProps = {
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  placeholder: string;
  onChange: (value: string) => void;
  error?: string | null;
};

export function SelectField({ label, value, options, placeholder, onChange, error }: SelectFieldProps) {
  const id = useId();
  const helpId = useId();
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className="select"
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? helpId : undefined}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? (
        <span id={helpId} className="field-error">
          {error}
        </span>
      ) : null}
    </div>
  );
}
