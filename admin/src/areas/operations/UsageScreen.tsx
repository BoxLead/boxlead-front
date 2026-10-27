import { useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Banner } from "../../../../src/components/ui/Banner";
import { ChoiceGroup } from "../../../../src/components/ui/ChoiceGroup";
import { Tag } from "../../../../src/components/ui/Tag";
import type { AdminPage } from "../../api/types";
import { DateText } from "../../components/DateText";
import { Screen } from "../../components/Screen";
import { Facts, Section, SectionGrid } from "../../components/Section";
import type { Column } from "../../components/list/DataTable";
import { DateFilter, FilterBar, SearchFilter, SelectFilter } from "../../components/list/Filters";
import { ListView } from "../../components/list/ListView";
import { useAdminQuery } from "../../components/list/useAdminQuery";
import { PAGE_PARAM, useListParams, type ListParams } from "../../components/list/useListParams";
import { formatCount } from "../../format";
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
  return formatCount(value);
}

function cache(read: number, write: number) {
  return (
    <span className="cell-stack">
      <span>Lectura {formatCount(read)}</span>
      <span className="sub-text">Escritura {formatCount(write)}</span>
    </span>
  );
}

function summaryCost(row: UsageTotals) {
  const priced = row.costCurrency !== null;
  return (
    <span className="cell-stack">
      <span>{priced ? formatCost(row.estimatedCostMicros, row.costCurrency) : "Sin costo"}</span>
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

function keyColumn(grouping: UsageGrouping): Column<UsageSummaryRow> {
  if (grouping === "DAY") return { key: "key", header: "Día", type: "date", cell: (row) => <DateText value={row.key} /> };
  if (grouping === "MODEL") return { key: "key", header: "Modelo", type: "id", width: "md", cell: (row) => <code className="mono-text">{row.key}</code> };
  return {
    key: "key",
    header: "Usuario",
    width: "md",
    cell: (row) => (
      <span className="cell-stack">
        <span>{row.email ?? "Sin email"}</span>
        <code className="mono-text sub-text">{row.key}</code>
      </span>
    ),
  };
}

function summaryColumns(grouping: UsageGrouping, range: Range): Column<UsageSummaryRow>[] {
  const columns: Column<UsageSummaryRow>[] = [
    keyColumn(grouping),
    { key: "runs", header: "Corridas", type: "number", cell: (row) => tokens(row.runs) },
    { key: "input", header: "Entrada", type: "number", cell: (row) => tokens(row.inputTokens) },
    { key: "output", header: "Salida", type: "number", cell: (row) => tokens(row.outputTokens) },
    { key: "cache", header: "Caché", type: "number", cell: (row) => cache(row.cacheReadTokens, row.cacheWriteTokens) },
    { key: "cost", header: "Costo estimado", type: "money", cell: summaryCost },
  ];
  if (grouping === "USER") {
    columns.push({
      key: "actions",
      header: "Acciones",
      type: "actions",
      cell: (row) => (
        <Link className="btn btn-ghost btn-sm" to={detailSearch(range, row.key)}>
          Ver detalle
        </Link>
      ),
    });
  }
  return columns;
}

const DETAIL_COLUMNS: Column<UsageDay>[] = [
  { key: "day", header: "Día", type: "date", cell: (row) => <DateText value={row.day} /> },
  { key: "user", header: "Usuario", type: "id", cell: (row) => <code className="mono-text">{row.userId}</code> },
  {
    key: "agent",
    header: "Agente y modelo",
    type: "id",
    width: "md",
    cell: (row) => (
      <span className="cell-stack">
        <code className="mono-text">{row.model}</code>
        <code className="mono-text sub-text">{row.agentId}</code>
      </span>
    ),
  },
  { key: "runs", header: "Corridas", type: "number", cell: (row) => tokens(row.runs) },
  { key: "input", header: "Entrada", type: "number", cell: (row) => tokens(row.inputTokens) },
  { key: "output", header: "Salida", type: "number", cell: (row) => tokens(row.outputTokens) },
  { key: "cache", header: "Caché", type: "number", cell: (row) => cache(row.cacheReadTokens, row.cacheWriteTokens) },
  {
    key: "cost",
    header: "Costo estimado",
    type: "money",
    cell: (row) =>
      row.estimatedCostMicros === null ? (
        <Tag tone="warning">Sin costo</Tag>
      ) : (
        <span className="cell-stack">
          <span>{formatCost(row.estimatedCostMicros, row.costCurrency)}</span>
          {row.priceVersion !== null ? <span className="sub-text">Precios versión {row.priceVersion}</span> : null}
        </span>
      ),
  },
];

function Totals({ totals }: { totals: readonly UsageTotals[] }) {
  return (
    <SectionGrid>
      {totals.map((total) => (
        <Section
          key={total.costCurrency ?? "none"}
          title={total.costCurrency ? `Costo estimado en ${total.costCurrency}` : "Sin moneda de costo"}
          hint={
            total.rowsWithoutCost > 0
              ? `${formatCount(total.rowsWithoutCost)} ${total.rowsWithoutCost === 1 ? "fila no tiene" : "filas no tienen"} costo calculado. Sus tokens suman acá y su costo no.`
              : undefined
          }
        >
          <p className="usage-total num">{total.costCurrency ? formatCost(total.estimatedCostMicros, total.costCurrency) : "Sin costo"}</p>
          <Facts
            columns={3}
            items={[
              { label: "Corridas", value: <span className="num">{formatCount(total.runs)}</span> },
              { label: "Entrada", value: <span className="num">{formatCount(total.inputTokens)}</span> },
              { label: "Salida", value: <span className="num">{formatCount(total.outputTokens)}</span> },
              { label: "Caché leída", value: <span className="num">{formatCount(total.cacheReadTokens)}</span> },
              { label: "Caché escrita", value: <span className="num">{formatCount(total.cacheWriteTokens)}</span> },
            ]}
          />
        </Section>
      ))}
    </SectionGrid>
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
    <Banner tone="warning" title="Revisá el período">
      {problem}
    </Banner>
  );
}

function SummaryView({ lead }: { lead: ReactNode }) {
  const params = useListParams(SUMMARY_KEYS);
  const range = useRange(params);
  const grouping = GROUPINGS.find((value) => value === params.value("groupBy")) ?? "USER";
  const search = apiSearch(range, params, { groupBy: params.value("groupBy") });
  const query = useAdminQuery<UsageSummary>(range.problem ? null : "/admin/usage/summary", search);
  const filters = (
    <FilterBar active={params.active} onClear={params.clear} lead={lead}>
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

function DetailView({ lead }: { lead: ReactNode }) {
  const params = useListParams(DETAIL_KEYS);
  const range = useRange(params);
  const userId = params.value("userId");
  const problem = range.problem ?? (userId && !isUuid(userId) ? "El id de usuario no tiene el formato correcto." : null);
  const query = useAdminQuery<AdminPage<UsageDay>>(problem ? null : "/admin/usage", apiSearch(range, params, { userId }));
  const filters = (
    <FilterBar active={params.active} onClear={params.clear} lead={lead}>
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

  const lead = (
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
  );

  return (
    <Screen
      title={item.label}
      description="Tokens y costo estimado de los agentes por usuario, día o modelo. El costo lo calcula core con sus precios."
    >
      {view === "detalle" ? <DetailView lead={lead} /> : <SummaryView lead={lead} />}
    </Screen>
  );
}
