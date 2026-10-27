import { useId, type FormEvent, type ReactNode } from "react";
import { SearchIcon } from "../../../../src/components/icons/UiIcons";
import "./List.css";

export type FilterOption = { value: string; label: string };

export function FilterBar({ children, active, onClear }: { children: ReactNode; active: boolean; onClear: () => void }) {
  return (
    <div className="filter-bar" role="search" aria-label="Filtros">
      {children}
      {active ? (
        <button type="button" className="btn btn-ghost filter-clear" onClick={onClear}>
          Limpiar filtros
        </button>
      ) : null}
    </div>
  );
}

type SelectFilterProps = {
  label: string;
  value: string;
  options: readonly FilterOption[];
  allLabel?: string;
  onChange: (value: string) => void;
};

export function SelectFilter({ label, value, options, allLabel = "Todos", onChange }: SelectFilterProps) {
  const id = useId();
  return (
    <div className="field filter-field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <select id={id} className="select" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function DateFilter({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const id = useId();
  return (
    <div className="field filter-field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <input id={id} className="input" type="date" value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

type SearchFilterProps = {
  label: string;
  value: string;
  placeholder?: string;
  onSubmit: (value: string) => void;
};

function SearchForm({ label, value, placeholder, onSubmit }: SearchFilterProps) {
  const id = useId();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const typed = new FormData(event.currentTarget).get("query");
    onSubmit(typeof typed === "string" ? typed.trim() : "");
  }

  return (
    <form className="field filter-field filter-search" onSubmit={submit}>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <div className="filter-search-row">
        <input id={id} className="input" type="search" name="query" defaultValue={value} placeholder={placeholder} />
        <button type="submit" className="btn btn-secondary btn-icon" aria-label="Buscar">
          <SearchIcon width={16} height={16} />
        </button>
      </div>
    </form>
  );
}

export function SearchFilter(props: SearchFilterProps) {
  return <SearchForm key={props.value} {...props} />;
}
