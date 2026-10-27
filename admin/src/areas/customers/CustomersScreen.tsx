import { Link } from "react-router-dom";
import { Tag } from "../../../../src/components/ui/Tag";
import { DateFilter, FilterBar, SearchFilter, SelectFilter } from "../../components/list/Filters";
import { ListView } from "../../components/list/ListView";
import { useListQuery } from "../../components/list/useListQuery";
import { Screen } from "../../components/Screen";
import { formatDate } from "../../format";
import { navItem } from "../../nav";
import { NO_SUBSCRIPTION, PLAN_LABELS, planLabel, SUBSCRIPTION_LABELS, SUBSCRIPTION_TONES } from "./labels";
import { PLAN_CODES, SUBSCRIPTION_STATUSES, type CustomerMatch } from "./types";
import "./customers.css";

const FILTER_KEYS = ["query", "plan", "status", "createdFrom", "createdTo"] as const;

const PLAN_OPTIONS = PLAN_CODES.map((code) => ({ value: code, label: PLAN_LABELS[code] }));
const STATUS_OPTIONS = [
  ...SUBSCRIPTION_STATUSES.map((status) => ({ value: status, label: SUBSCRIPTION_LABELS[status] })),
  { value: NO_SUBSCRIPTION, label: "Sin suscripción" },
];

function SubscriptionTag({ row }: { row: CustomerMatch }) {
  if (!row.subscriptionStatus) return <span className="customer-muted-inline">Sin suscripción</span>;
  return (
    <span>
      <Tag tone={SUBSCRIPTION_TONES[row.subscriptionStatus]}>{SUBSCRIPTION_LABELS[row.subscriptionStatus]}</Tag>
    </span>
  );
}

export function CustomersScreen() {
  const { params, query } = useListQuery<CustomerMatch>("/admin/customers", FILTER_KEYS);
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
              placeholder="Email, nombre o id"
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
            cell: (row) => (
              <div className="customer-cell">
                <Link className="customer-link" to={`/usuarios/${row.id}`}>
                  {row.email}
                </Link>
                {row.name || row.legalName ? <span className="customer-cell-sub">{row.legalName ?? row.name}</span> : null}
              </div>
            ),
          },
          { key: "plan", header: "Plan", cell: (row) => planLabel(row.planCode) },
          { key: "status", header: "Suscripción", cell: (row) => <SubscriptionTag row={row} /> },
          { key: "createdAt", header: "Alta", cell: (row) => formatDate(row.createdAt) },
        ]}
      />
    </Screen>
  );
}
