import { useRef, useState, type KeyboardEvent } from "react";
import { useToast } from "../../../../src/components/ui/toast";
import { SearchIcon } from "../../../../src/components/icons/UiIcons";
import { Banner } from "../../../../src/components/ui/Banner";
import { errorText } from "../../api/errors";
import type { AdminPage } from "../../api/types";
import { ReasonDialog } from "../../components/ReasonDialog";
import { grantDemo, searchCustomers } from "./api";
import { Field, FormDialog, Summary } from "./FormDialog";
import { MAX_DEMO_DAYS, type CustomerMatch } from "./types";
import { daysText, demoDaysProblem, demoDaysValue } from "./validation";

type Search =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; page: AdminPage<CustomerMatch> };

type GrantDemoFlowProps = {
  open: boolean;
  onClose: () => void;
  onGranted: () => void;
};

const PLAN_LABELS: Record<string, string> = {
  DEMO: "Demo",
  STARTER: "Starter",
  BUSINESS: "Business",
  ENTERPRISE: "Enterprise",
};

function planText(planCode: string | null): string {
  return planCode ? `Plan ${PLAN_LABELS[planCode] ?? planCode}` : "Sin plan";
}

function customerName(customer: CustomerMatch): string | null {
  return customer.legalName ?? customer.name;
}

export function GrantDemoFlow({ open, onClose, onGranted }: GrantDemoFlowProps) {
  const toast = useToast();
  const [text, setText] = useState("");
  const [search, setSearch] = useState<Search>({ status: "idle" });
  const [selected, setSelected] = useState<CustomerMatch | null>(null);
  const [days, setDays] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [touched, setTouched] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);
  const controller = useRef<AbortController | null>(null);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setText("");
      setSearch({ status: "idle" });
      setSelected(null);
      setDays("");
      setConfirming(false);
      setTouched(false);
    }
  }

  const daysProblem = demoDaysProblem(days);
  const userProblem = selected ? null : "Buscá y elegí un usuario.";

  function runSearch() {
    const query = text.trim();
    if (!query) return;
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setSearch({ status: "loading" });
    setSelected(null);
    searchCustomers(query, current.signal)
      .then((page) => setSearch({ status: "ready", page }))
      .catch((error: unknown) => {
        if (!current.signal.aborted) setSearch({ status: "error", message: errorText(error) });
      });
  }

  function onSearchKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    runSearch();
  }

  function next() {
    setTouched(true);
    if (!userProblem && !daysProblem) setConfirming(true);
  }

  async function confirm(reason: string) {
    if (!selected) return;
    await grantDemo(selected.id, demoDaysValue(days), reason);
    toast({ tone: "success", message: `Le otorgaste una Demo a ${selected.email}.` });
    onGranted();
    onClose();
  }

  return (
    <>
      <FormDialog
        open={open && !confirming}
        title="Otorgar Demo"
        description="Para un usuario que ya tiene cuenta. Arranca ahora mismo."
        submitLabel="Continuar"
        size="lg"
        onSubmit={next}
        onClose={onClose}
      >
        <Field label="Buscar usuario" help="Por email, nombre, razón social o id." error={touched && search.status !== "ready" ? userProblem : null}>
          {(props) => (
            <div className="filter-search-row">
              <input
                {...props}
                className="input"
                type="search"
                autoComplete="off"
                value={text}
                onChange={(event) => setText(event.target.value)}
                onKeyDown={onSearchKey}
              />
              <button type="button" className="btn btn-secondary btn-icon" aria-label="Buscar" onClick={runSearch}>
                <SearchIcon width={16} height={16} />
              </button>
            </div>
          )}
        </Field>
        <SearchResults search={search} selected={selected} problem={touched ? userProblem : null} onSelect={setSelected} />
        <Field label="Días de Demo" help="Opcional. Si lo dejás vacío usa la duración del plan Demo." error={touched ? daysProblem : null}>
          {(props) => (
            <input
              {...props}
              className="input"
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_DEMO_DAYS}
              value={days}
              onChange={(event) => setDays(event.target.value)}
            />
          )}
        </Field>
      </FormDialog>
      <ReasonDialog open={open && confirming} title="Otorgar Demo" confirmLabel="Otorgar Demo" onConfirm={confirm} onClose={() => setConfirming(false)}>
        {selected ? (
          <Summary
            rows={[
              ["Usuario", selected.email],
              ["Demo", daysText(demoDaysValue(days))],
              ["Arranca", "Ahora"],
            ]}
          />
        ) : null}
        <p>Un usuario tiene una sola Demo. Si ya tuvo una, primero hay que quitarla.</p>
      </ReasonDialog>
    </>
  );
}

type SearchResultsProps = {
  search: Search;
  selected: CustomerMatch | null;
  problem: string | null;
  onSelect: (customer: CustomerMatch) => void;
};

function SearchResults({ search, selected, problem, onSelect }: SearchResultsProps) {
  if (search.status === "idle") return null;
  if (search.status === "loading") {
    return (
      <div className="invitations-results" role="status">
        <span className="skeleton invitations-result-skeleton" />
        <span className="skeleton invitations-result-skeleton" />
        <span className="visually-hidden">Buscando…</span>
      </div>
    );
  }
  if (search.status === "error") return <Banner tone="danger" title="No pudimos buscar">{search.message}</Banner>;
  const { items, totalItems } = search.page;
  if (items.length === 0) return <p className="invitations-results-empty">No encontramos usuarios con ese texto.</p>;
  return (
    <fieldset className="field invitations-results">
      <legend className="field-label">Elegí el usuario</legend>
      {items.map((customer) => {
        const name = customerName(customer);
        return (
          <label key={customer.id} className={`invitations-result${selected?.id === customer.id ? " invitations-result-selected" : ""}`}>
            <input type="radio" name="demo-user" checked={selected?.id === customer.id} onChange={() => onSelect(customer)} />
            <span className="invitations-result-body">
              <span className="invitations-email">{customer.email}</span>
              <span className="invitations-note">
                {[name, planText(customer.planCode)].filter(Boolean).join(" · ")}
              </span>
            </span>
          </label>
        );
      })}
      {totalItems > items.length ? (
        <p className="invitations-note">Mostramos {items.length} de {totalItems}. Afiná la búsqueda si no está.</p>
      ) : null}
      {problem ? <p className="field-error">{problem}</p> : null}
    </fieldset>
  );
}
