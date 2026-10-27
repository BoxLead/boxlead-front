import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Banner } from "../../../../src/components/ui/Banner";
import { ChoiceGroup } from "../../../../src/components/ui/ChoiceGroup";
import { Tag } from "../../../../src/components/ui/Tag";
import type { AdminPage } from "../../api/types";
import { Screen } from "../../components/Screen";
import type { Column } from "../../components/list/DataTable";
import { DateFilter, FilterBar, SearchFilter, SelectFilter } from "../../components/list/Filters";
import { ListView } from "../../components/list/ListView";
import { useAdminQuery } from "../../components/list/useAdminQuery";
import { PAGE_PARAM, useListParams, type ListParams } from "../../components/list/useListParams";
import { formatCount, formatDate } from "../../format";
import { navItem } from "../../nav";
import { GROUPING_LABELS } from "./labels";
import type { UsageDay, UsageGrouping, UsageSummary, UsageSummaryRow, UsageTotals } from "./types";
import { formatCost, isUuid, monthStart, rangeProblem, todayInBuenosAires } from "./usage";
import "./Operations.css";

type View = "resumen" | "detalle";

const SUMMARY_KEYS = ["from", "to", "groupBy"] as const;
const DETAIL_KEYS = ["from", "to", "userId"] as const;
const GROUPINGS: readonly UsageGrouping[] = ["USER", "DAY", "MODEL"];

type Range = { from: string; to: string };

function useRange(params: ListParams): Range & { problem: string | null } {
  const [today] = useState(() => todayInBuenosAires());
  const from = params.value("from") || monthStart(today);
  const to = params.value("to") || today;
  return { from, to, problem: rangeProblem(from, to) };
}

function apiSearch(range: Range, params: ListParams, extra: Record<string, string>): string {
  const query = new URLSearchParams({ from: range.from, to: range.to });
  for (const [key, value] of Object.entries(extra)) if (value) query.set(key, value);
  if (params.page > 0) query.set(PAGE_PARAM, String(params.page));
  return query.toString();
}

function tokens(value: number) {
  return <span className="num ops-nowrap">{formatCount(value)}</span>;
}

function cache(read: number, write: number) {
  return (
    <span className="ops-stack">
      <span className="num ops-nowrap">Lectura {formatCount(read)}</span>
      <span className="num ops-nowrap ops-muted">Escritura {formatCount(write)}</span>
    </span>
  );
}

function summaryCost(row: UsageTotals) {
  const priced = row.costCurrency !== null;
  return (
    <span className="ops-stack ops-end">
      <span className="num">{priced ? formatCost(row.estimatedCostMicros, row.costCurrency) : "Sin costo"}</span>
      {row.rowsWithoutCost > 0 ? (
        <Tag tone="warning">
          {formatCount(row.rowsWithoutCost)} {row.rowsWithoutCost === 1 ? "fila sin costo" : "filas sin costo"}
        </Tag>
      ) : null}
    </span>
  );
}

function detailSearch(range: Range, userId: string): string {
  return `?${new URLSearchParams({ view: "detalle", from: range.from, to: range.to, userId }).toString()}`;
}

function keyColumn(grouping: UsageGrouping, range: Range): Column<UsageSummaryRow> {
  if (grouping === "DAY") return { key: "key", header: "Día", cell: (row) => formatDate(row.key) };
  if (grouping === "MODEL") return { key: "key", header: "Modelo", cell: (row) => <code className="ops-code">{row.key}</code> };
  return {
    key: "key",
    header: "Usuario",
    cell: (row) => (
      <span className="ops-stack">
        <span>{row.email ?? "Sin email"}</span>
        <code className="ops-code ops-muted">{row.key}</code>
        <Link className="ops-link" to={detailSearch(range, row.key)}>
          Ver detalle
        </Link>
      </span>
    ),
  };
}

function summaryColumns(grouping: UsageGrouping, range: Range): Column<UsageSummaryRow>[] {
  return [
    keyColumn(grouping, range),
    { key: "runs", header: "Corridas", align: "end", cell: (row) => tokens(row.runs) },
    { key: "input", header: "Entrada", align: "end", cell: (row) => tokens(row.inputTokens) },
    { key: "output", header: "Salida", align: "end", cell: (row) => tokens(row.outputTokens) },
    { key: "cache", header: "Caché", align: "end", cell: (row) => cache(row.cacheReadTokens, row.cacheWriteTokens) },
    { key: "cost", header: "Costo estimado", align: "end", cell: summaryCost },
  ];
}

const DETAIL_COLUMNS: Column<UsageDay>[] = [
  { key: "day", header: "Día", cell: (row) => formatDate(row.day) },
  { key: "user", header: "Usuario", cell: (row) => <code className="ops-code">{row.userId}</code> },
  {
    key: "agent",
    header: "Agente y modelo",
    cell: (row) => (
      <span className="ops-stack">
        <code className="ops-code">{row.model}</code>
        <code className="ops-code ops-muted">{row.agentId}</code>
      </span>
    ),
  },
  { key: "runs", header: "Corridas", align: "end", cell: (row) => tokens(row.runs) },
  { key: "input", header: "Entrada", align: "end", cell: (row) => tokens(row.inputTokens) },
  { key: "output", header: "Salida", align: "end", cell: (row) => tokens(row.outputTokens) },
  { key: "cache", header: "Caché", align: "end", cell: (row) => cache(row.cacheReadTokens, row.cacheWriteTokens) },
  {
    key: "cost",
    header: "Costo estimado",
    align: "end",
    cell: (row) =>
      row.estimatedCostMicros === null ? (
        <Tag tone="warning">Sin costo</Tag>
      ) : (
        <span className="ops-stack ops-end">
          <span className="num">{formatCost(row.estimatedCostMicros, row.costCurrency)}</span>
          {row.priceVersion !== null ? <span className="ops-muted">Precios versión {row.priceVersion}</span> : null}
        </span>
      ),
  },
];

function Totals({ totals }: { totals: readonly UsageTotals[] }) {
  return (
    <section className="ops-totals" aria-label="Totales del período">
      {totals.map((total) => (
        <article key={total.costCurrency ?? "none"} className="panel ops-total">
          <p className="panel-title">{total.costCurrency ? `Costo estimado en ${total.costCurrency}` : "Sin moneda de costo"}</p>
          <p className="ops-total-value num">
            {total.costCurrency ? formatCost(total.estimatedCostMicros, total.costCurrency) : "Sin costo"}
          </p>
          <dl className="ops-total-stats">
            <div>
              <dt>Corridas</dt>
              <dd className="num">{formatCount(total.runs)}</dd>
            </div>
            <div>
              <dt>Entrada</dt>
              <dd className="num">{formatCount(total.inputTokens)}</dd>
            </div>
            <div>
              <dt>Salida</dt>
              <dd className="num">{formatCount(total.outputTokens)}</dd>
            </div>
            <div>
              <dt>Caché leída</dt>
              <dd className="num">{formatCount(total.cacheReadTokens)}</dd>
            </div>
            <div>
              <dt>Caché escrita</dt>
              <dd className="num">{formatCount(total.cacheWriteTokens)}</dd>
            </div>
          </dl>
          {total.rowsWithoutCost > 0 ? (
            <p className="ops-note">
              {formatCount(total.rowsWithoutCost)} {total.rowsWithoutCost === 1 ? "fila no tiene" : "filas no tienen"} costo calculado.
              Sus tokens suman acá y su costo no.
            </p>
          ) : null}
        </article>
      ))}
    </section>
  );
}

function RangeFilters({ params, range }: { params: ListParams; range: Range }) {
  return (
    <>
      <DateFilter label="Desde" value={range.from} onChange={(value) => params.setFilter("from", value)} />
      <DateFilter label="Hasta" value={range.to} onChange={(value) => params.setFilter("to", value)} />
    </>
  );
}

function RangeProblem({ problem }: { problem: string }) {
  return (
    <div className="panel ops-panel-pad">
      <Banner tone="warning" title="Revisá el período">
        {problem}
      </Banner>
    </div>
  );
}

function SummaryView() {
  const params = useListParams(SUMMARY_KEYS);
  const range = useRange(params);
  const grouping = GROUPINGS.find((value) => value === params.value("groupBy")) ?? "USER";
  const search = apiSearch(range, params, { groupBy: params.value("groupBy") });
  const query = useAdminQuery<UsageSummary>(range.problem ? null : "/admin/usage/summary", search);
  const filters = (
    <FilterBar active={params.active} onClear={params.clear}>
      <RangeFilters params={params} range={range} />
      <SelectFilter
        label="Agrupar por"
        value={grouping === "USER" ? "" : grouping}
        allLabel={GROUPING_LABELS.USER}
        options={[
          { value: "DAY", label: GROUPING_LABELS.DAY },
          { value: "MODEL", label: GROUPING_LABELS.MODEL },
        ]}
        onChange={(value) => params.setFilter("groupBy", value)}
      />
    </FilterBar>
  );
  if (range.problem) {
    return (
      <section className="list-view" aria-label="Resumen de uso">
        {filters}
        <RangeProblem problem={range.problem} />
      </section>
    );
  }
  return (
    <div className="ops-sections">
      {filters}
      {query.status === "ready" && query.data.totals.length > 0 ? <Totals totals={query.data.totals} /> : null}
      <ListView<UsageSummaryRow>
        caption={`Uso por ${GROUPING_LABELS[grouping].toLowerCase()}`}
        query={query}
        columns={summaryColumns(grouping, range)}
        rowKey={(row) => `${row.key}:${row.costCurrency ?? ""}`}
        emptyTitle="No hubo uso de IA en este período"
        emptyHint="Probá con otras fechas."
        onPageChange={params.setPage}
      />
    </div>
  );
}

function DetailView() {
  const params = useListParams(DETAIL_KEYS);
  const range = useRange(params);
  const userId = params.value("userId");
  const problem = range.problem ?? (userId && !isUuid(userId) ? "El id de usuario no tiene el formato correcto." : null);
  const query = useAdminQuery<AdminPage<UsageDay>>(problem ? null : "/admin/usage", apiSearch(range, params, { userId }));
  const filters = (
    <FilterBar active={params.active} onClear={params.clear}>
      <RangeFilters params={params} range={range} />
      <SearchFilter label="Id del usuario" value={userId} placeholder="Todos los usuarios" onSubmit={(value) => params.setFilter("userId", value)} />
    </FilterBar>
  );
  if (problem) {
    return (
      <section className="list-view" aria-label="Detalle de uso">
        {filters}
        <RangeProblem problem={problem} />
      </section>
    );
  }
  return (
    <ListView<UsageDay>
      caption="Detalle de uso por día, usuario, agente y modelo"
      query={query}
      columns={DETAIL_COLUMNS}
      rowKey={(row) => `${row.day}:${row.userId}:${row.agentId}:${row.model}`}
      filters={filters}
      filtered={Boolean(userId)}
      onClearFilters={() => params.setFilter("userId", null)}
      emptyTitle="No hubo uso de IA en este período"
      emptyHint="Probá con otras fechas."
      onPageChange={params.setPage}
    />
  );
}

export function UsageScreen() {
  const item = navItem("usage");
  const [params, setParams] = useSearchParams();
  const view: View = params.get("view") === "detalle" ? "detalle" : "resumen";

  function changeView(next: View) {
    setParams((current) => {
      const kept = new URLSearchParams();
      for (const key of ["from", "to"]) {
        const value = current.get(key);
        if (value) kept.set(key, value);
      }
      if (next === "detalle") kept.set("view", "detalle");
      return kept;
    });
  }

  return (
    <Screen
      title={item.label}
      description="Tokens y costo estimado de los agentes por usuario, día o modelo. El costo lo calcula core con sus precios."
    >
      <div className="ops-switch">
        <ChoiceGroup<View>
          label="Vista"
          variant="segmented"
          value={view}
          onChange={changeView}
          choices={[
            { value: "resumen", label: "Resumen" },
            { value: "detalle", label: "Detalle" },
          ]}
        />
      </div>
      {view === "detalle" ? <DetailView /> : <SummaryView />}
    </Screen>
  );
}
