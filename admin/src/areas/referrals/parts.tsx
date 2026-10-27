import { useId, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "../../../../src/components/EmptyState/EmptyState";
import { Banner } from "../../../../src/components/ui/Banner";
import { FactsSkeleton } from "../../components/Skeleton";
import type { DetailResult } from "./hooks";
export { Facts, Muted, Section, SectionGrid, type Fact } from "../../components/Section";
import "./referrals.css";

type DetailStateProps<T> = {
  query: DetailResult<T> & { reload: () => void };
  notFound: string;
  back: { to: string; label: string };
  children: (data: T) => ReactNode;
};

export function DetailState<T>({ query, notFound, back, children }: DetailStateProps<T>) {
  if (query.status === "loading") {
    return <FactsSkeleton rows={6} />;
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

export function FinanceOnly({ what }: { what: string }) {
  return <p className="restricted-text">{what} los ve solo Finanzas.</p>;
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
  max?: string;
  autoComplete?: string;
};

export function TextField({ label, value, onChange, error, help, type = "text", optional, maxLength, max, autoComplete = "off" }: TextFieldProps) {
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
        max={max}
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
