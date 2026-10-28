import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { SearchIcon } from "../../../../src/components/icons/UiIcons";
import { Banner } from "../../../../src/components/ui/Banner";
import { errorText } from "../../api/errors";
import type { AdminPage } from "../../api/types";
import { referralsApi } from "./api";
import { customerName, planOf } from "./labels";
import type { CustomerMatch } from "./types";

type Search =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; page: AdminPage<CustomerMatch> };

type UserPickerProps = {
  selected: CustomerMatch | null;
  onSelect: (customer: CustomerMatch) => void;
  error?: string | null;
};

export function UserPicker({ selected, onSelect, error }: UserPickerProps) {
  const [text, setText] = useState("");
  const [search, setSearch] = useState<Search>({ status: "idle" });
  const controller = useRef<AbortController | null>(null);
  const fieldId = useId();
  const helpId = useId();
  const group = useId();

  useEffect(() => () => controller.current?.abort(), []);

  function run() {
    const query = text.trim();
    if (!query) return;
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setSearch({ status: "loading" });
    referralsApi.searchCustomers(query, current.signal).then(
      (page) => setSearch({ status: "ready", page }),
      (failure: unknown) => {
        if (!current.signal.aborted) setSearch({ status: "error", message: errorText(failure) });
      },
    );
  }

  function onKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    run();
  }

  const message = error ?? "Por email, nombre, razón social o id.";

  return (
    <div className="ref-picker">
      <div className="field">
        <label className="field-label" htmlFor={fieldId}>
          Buscar usuario
        </label>
        <div className="ref-picker-row">
          <input
            id={fieldId}
            className="input"
            type="search"
            autoComplete="off"
            value={text}
            aria-invalid={error ? true : undefined}
            aria-describedby={helpId}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={onKey}
          />
          <button type="button" className="btn btn-secondary btn-icon" aria-label="Buscar" onClick={run}>
            <SearchIcon width={16} height={16} />
          </button>
        </div>
        <span id={helpId} className={error ? "field-error" : "field-help"}>
          {message}
        </span>
      </div>
      {search.status === "loading" ? (
        <div className="ref-results" role="status">
          <span className="skeleton ref-result-skeleton" />
          <span className="skeleton ref-result-skeleton" />
          <span className="visually-hidden">Buscando…</span>
        </div>
      ) : search.status === "error" ? (
        <Banner tone="danger" title="No pudimos buscar">
          {search.message}
        </Banner>
      ) : search.status === "ready" && search.page.items.length === 0 ? (
        <p className="ref-muted">No encontramos usuarios con ese texto.</p>
      ) : search.status === "ready" ? (
        <fieldset className="ref-results">
          <legend className="field-label">Elegí el usuario</legend>
          {search.page.items.map((customer) => (
            <label key={customer.id} className={selected?.id === customer.id ? "ref-result ref-result-selected" : "ref-result"}>
              <input type="radio" name={group} checked={selected?.id === customer.id} onChange={() => onSelect(customer)} />
              <span className="ref-result-body">
                <span className="ref-result-email">{customer.email}</span>
                <span className="ref-sub">{[customerName(customer), planOf(customer.planCode, customer.planSource)].filter(Boolean).join(" · ")}</span>
              </span>
            </label>
          ))}
          {search.page.totalItems > search.page.items.length ? (
            <p className="ref-sub">
              Mostramos {search.page.items.length} de {search.page.totalItems}. Afiná la búsqueda si no está.
            </p>
          ) : null}
        </fieldset>
      ) : null}
      {selected ? (
        <div className="ref-picked" aria-live="polite">
          <span className="ref-sub">Usuario elegido</span>
          <strong className="ref-result-email">{selected.email}</strong>
          <span>{customerName(selected) ?? "Sin nombre cargado"}</span>
        </div>
      ) : null}
    </div>
  );
}
