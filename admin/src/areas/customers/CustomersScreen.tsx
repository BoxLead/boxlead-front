import { Link } from "react-router-dom";
import { DateFilter, FilterBar, SearchFilter, SelectFilter } from "../../components/list/Filters";
import { ListView } from "../../components/list/ListView";
import { dateRange, enumOf, type FilterRules } from "../../components/list/filterRules";
import { useListQuery } from "../../components/list/useListQuery";
import { DateText } from "../../components/DateText";
import { Screen } from "../../components/Screen";
import { StatusBadge } from "../../components/StatusBadge";
import { navItem } from "../../nav";
import { NO_SUBSCRIPTION_LABEL, SUBSCRIPTION_STATUS } from "../../status";
import { NO_SUBSCRIPTION, PLAN_LABELS, planWithSource, SUBSCRIPTION_LABELS, TEAM_FILTER, TEAM_LABEL } from "./labels";
import { PLAN_CODES, SUBSCRIPTION_STATUSES, type CustomerMatch } from "./types";
import "./customers.css";

const FILTER_KEYS = ["query", "plan", "status", "createdFrom", "createdTo"] as const;

const PLAN_OPTIONS = [
  ...PLAN_CODES.map((code) => ({ value: code, label: PLAN_LABELS[code] })),
  { value: TEAM_FILTER, label: TEAM_LABEL },
];
const STATUS_OPTIONS = [
  ...SUBSCRIPTION_STATUSES.map((status) => ({ value: status, label: SUBSCRIPTION_LABELS[status] })),
  { value: NO_SUBSCRIPTION, label: NO_SUBSCRIPTION_LABEL },
];
const RULES: FilterRules = {
  query: { kind: "query" },
  plan: enumOf(PLAN_OPTIONS),
  status: enumOf(STATUS_OPTIONS),
  ...dateRange("createdFrom", "createdTo"),
};

export function CustomersScreen() {
  const { params, query } = useListQuery<CustomerMatch>("/admin/customers", FILTER_KEYS, RULES);
  const item = navItem("customers");

  return (
    <Screen title={item.label} description={item.description}>
      <ListView
        caption="Usuarios"
        query={query}
        rowKey={(row) => row.id}
        filtered={params.active}
        onClearFilters={params.clear}
        onPageChange={params.setPage}
        emptyTitle="Todavía no hay nada para mostrar acá"
        emptyHint="Cuando alguien cree su cuenta en BoxLead aparece en esta lista."
        filters={
          <FilterBar active={params.active} onClear={params.clear}>
            <SearchFilter
              label="Buscar"
              value={params.value("query")}
              placeholder="Email, nombre o id, distingue tildes"
              onSubmit={(value) => params.setFilter("query", value)}
            />
            <SelectFilter
              label="Plan"
              value={params.value("plan")}
              options={PLAN_OPTIONS}
              onChange={(value) => params.setFilter("plan", value)}
            />
            <SelectFilter
              label="Suscripción"
              value={params.value("status")}
              options={STATUS_OPTIONS}
              allLabel="Todas"
              onChange={(value) => params.setFilter("status", value)}
            />
            <DateFilter
              label="Alta desde"
              value={params.value("createdFrom")}
              onChange={(value) => params.setFilter("createdFrom", value)}
            />
            <DateFilter label="Alta hasta" value={params.value("createdTo")} onChange={(value) => params.setFilter("createdTo", value)} />
          </FilterBar>
        }
        columns={[
          {
            key: "email",
            header: "Usuario",
            width: "lg",
            cell: (row) => (
              <span className="cell-stack">
                <Link className="entity-link" to={`/usuarios/${row.id}`}>
                  {row.email}
                </Link>
                {row.name || row.legalName ? <span className="sub-text">{row.legalName ?? row.name}</span> : null}
              </span>
            ),
          },
          { key: "plan", header: "Plan", width: "xs", cell: (row) => planWithSource(row.planCode, row.planSource) },
          {
            key: "status",
            header: "Suscripción",
            type: "status",
            cell: (row) =>
              row.subscriptionStatus ? (
                <StatusBadge status={SUBSCRIPTION_STATUS[row.subscriptionStatus]} />
              ) : (
                <span className="muted-text">{NO_SUBSCRIPTION_LABEL}</span>
              ),
          },
          { key: "createdAt", header: "Alta", type: "date", cell: (row) => <DateText value={row.createdAt} /> },
        ]}
      />
    </Screen>
  );
}
