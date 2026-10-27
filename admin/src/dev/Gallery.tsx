import { useState } from "react";
import { EmptyState } from "../../../src/components/EmptyState/EmptyState";
import { ChoiceGroup } from "../../../src/components/ui/ChoiceGroup";
import type { Money as MoneyValue } from "../api/types";
import { Bars } from "../components/Bars";
import { DateText } from "../components/DateText";
import { DataTable, type Column } from "../components/list/DataTable";
import { DateFilter, FilterBar, SearchFilter, SelectFilter } from "../components/list/Filters";
import { Money } from "../components/Money";
import { MonthPicker } from "../components/MonthPicker";
import { Screen } from "../components/Screen";
import { Facts, Muted, Section, SectionGrid } from "../components/Section";
import { CardsSkeleton, FactsSkeleton, TableSkeleton } from "../components/Skeleton";
import { StatCard, StatGrid } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import {
  CODE_STATUS,
  COMMISSION_STATUS,
  DEMO_STATUS,
  FACTOR_STATUS,
  INVITATION_STATUS,
  INVOICE_STATUS,
  PAYMENT_STATUS,
  PAYOUT_STATUS,
  REFUND_STATUS,
  REQUEST_KIND,
  RESELLER_STATUS,
  SUBSCRIPTION_STATUS,
  type StatusLabel,
} from "../status";
import "./Gallery.css";

const TABLES: [string, Record<string, StatusLabel>][] = [
  ["Suscripción", SUBSCRIPTION_STATUS],
  ["Pago", PAYMENT_STATUS],
  ["Reembolso", REFUND_STATUS],
  ["Factura", INVOICE_STATUS],
  ["Invitación", INVITATION_STATUS],
  ["Demo", DEMO_STATUS],
  ["Revendedor", RESELLER_STATUS],
  ["Código", CODE_STATUS],
  ["Comisión", COMMISSION_STATUS],
  ["Liquidación", PAYOUT_STATUS],
  ["Factor", FACTOR_STATUS],
  ["Pedido", REQUEST_KIND],
];

type Row = { id: string; email: string; plan: string; status: StatusLabel; amount: MoneyValue; date: string };

const ROWS: Row[] = [
  { id: "0b0e0000-0000-4000-8001-000000000001", email: "lucia@agencia-norte.example", plan: "Business", status: SUBSCRIPTION_STATUS.ACTIVE, amount: { amountMinor: 8700000, currency: "ARS" }, date: "2026-10-21T12:33:00Z" },
  { id: "0b0e0000-0000-4000-8001-000000000002", email: "martin@tienda-sur.example", plan: "Starter", status: SUBSCRIPTION_STATUS.PAST_DUE, amount: { amountMinor: 1234500, currency: "ARS" }, date: "2026-10-18T15:10:00Z" },
  { id: "0b0e0000-0000-4000-8001-000000000003", email: "sofia@estudio-lago.example", plan: "Enterprise", status: SUBSCRIPTION_STATUS.CANCELED, amount: { amountMinor: 6000, currency: "USD" }, date: "2026-09-30T09:00:00Z" },
];

const COLUMNS: readonly Column<Row>[] = [
  { key: "email", header: "Cliente", width: "md", cell: (row) => <a className="entity-link" href="#tabla">{row.email}</a> },
  { key: "id", header: "Id", type: "id", cell: (row) => <code className="mono-text sub-text">{row.id.slice(0, 8)}</code> },
  { key: "plan", header: "Plan", cell: (row) => row.plan },
  { key: "status", header: "Estado", type: "status", cell: (row) => <StatusBadge status={row.status} /> },
  { key: "amount", header: "Monto", type: "money", cell: (row) => <Money money={row.amount} code /> },
  { key: "date", header: "Alta", type: "date", cell: (row) => <DateText value={row.date} /> },
  {
    key: "actions",
    header: "Acciones",
    type: "actions",
    cell: () => (
      <span className="row-actions">
        <button type="button" className="btn btn-ghost btn-sm">
          Pagos
        </button>
        <button type="button" className="btn btn-secondary btn-sm">
          Pausar
        </button>
      </span>
    ),
  },
];

const DAYS = Array.from({ length: 30 }, (_, index) => ({
  key: String(index),
  label: `${index + 1} oct 2026`,
  value: [3, 1, 6, 2, 4, 1, 5, 4, 4, 1, 6, 2, 3, 2, 6, 2, 3, 1, 5, 3, 4, 2, 5, 4, 1, 3, 2, 6, 3, 2][index],
}));

export function GalleryScreen() {
  const [view, setView] = useState("todas");
  const [plan, setPlan] = useState("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [month, setMonth] = useState("2026-10");

  return (
    <Screen
      title="Primitivas del backoffice"
      description="Cada pieza compartida tal como se ve en el tema actual. Solo en desarrollo."
      crumbs={[{ to: "/", label: "Inicio" }]}
      actions={
        <>
          <button type="button" className="btn btn-secondary">
            Secundaria
          </button>
          <button type="button" className="btn btn-primary">
            Primaria
          </button>
        </>
      }
      meta={
        <Facts
          strip
          label="Resumen"
          items={[
            { label: "Plan", value: "Business" },
            { label: "Suscripción", value: <StatusBadge status={SUBSCRIPTION_STATUS.ACTIVE} /> },
            { label: "Próximo cobro", value: <DateText value="2026-11-21T12:00:00Z" /> },
            { label: "Total", value: <Money money={{ amountMinor: 8700000, currency: "ARS" }} code strong /> },
          ]}
        />
      }
    >
      <div className="gallery">
        <Section title="Estados" hint="Una palabra por estado, con el tono de la tabla única.">
          <dl className="gallery-statuses">
            {TABLES.map(([name, table]) => (
              <div key={name} className="gallery-status">
                <dt>{name}</dt>
                <dd>
                  {Object.entries(table).map(([key, status]) => (
                    <StatusBadge key={key} status={status} detail={key} />
                  ))}
                </dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section title="Tarjetas de métrica">
          <StatGrid>
            <StatCard label="Usuarios nuevos" value="24" period="Octubre" delta={{ value: 4, label: "que el mes pasado" }} />
            <StatCard label="Suscripciones activas" value="131" period="Octubre" delta={{ value: 0, label: "igual que el mes pasado" }} />
            <StatCard label="Pagos rechazados" value="3" period="Octubre" tone="danger" delta={{ value: 2, label: "más que el mes pasado" }} />
            <StatCard label="Ingresos" value={<Money money={{ amountMinor: 1234567800, currency: "ARS" }} />} period="Octubre" detail="Cobrado en Mercado Pago" />
          </StatGrid>
        </Section>

        <Section title="Barra de herramientas" hint="Segmentado a la izquierda, filtros en orden fijo, acciones a la derecha.">
          <FilterBar
            active={Boolean(plan || search || from)}
            onClear={() => {
              setPlan("");
              setSearch("");
              setFrom("");
            }}
            lead={
              <ChoiceGroup
                label="Vista"
                variant="segmented"
                value={view}
                onChange={setView}
                choices={[
                  { value: "todas", label: "Todas" },
                  { value: "activas", label: "Activas" },
                ]}
              />
            }
            actions={<MonthPicker value={month} max="2026-10" onChange={setMonth} />}
          >
            <SearchFilter label="Buscar" value={search} placeholder="Email, nombre o id" onSubmit={setSearch} />
            <SelectFilter
              label="Plan"
              value={plan}
              options={[
                { value: "STARTER", label: "Starter" },
                { value: "BUSINESS", label: "Business" },
              ]}
              onChange={setPlan}
            />
            <DateFilter label="Alta desde" value={from} onChange={setFrom} />
          </FilterBar>
        </Section>

        <Section title="Tabla con columnas tipadas" flush>
          <DataTable caption="Ejemplo" columns={COLUMNS} rows={ROWS} rowKey={(row) => row.id} />
        </Section>

        <SectionGrid>
          <Section title="Fichas" hint="Dos columnas que bajan a una.">
            <Facts
              columns={2}
              items={[
                { label: "Razón social", value: "Agencia Norte de Prueba SRL" },
                { label: "CUIT", value: "30-11111111-9" },
                { label: "Medio de cobro", value: "Transferencia bancaria" },
                { label: "Términos aceptados", value: <DateText value="2026-07-30T13:23:00Z" time /> },
              ]}
            />
          </Section>
          <Section
            title="Con acciones"
            actions={
              <button type="button" className="btn btn-secondary btn-sm">
                Nuevo código
              </button>
            }
          >
            <Muted>Todavía no tiene códigos.</Muted>
          </Section>
          <Section title="Barras" wide hint="En los últimos 30 días hubo 98 clics.">
            <Bars caption="Clics por día" unit="clics" items={DAYS} />
          </Section>
        </SectionGrid>

        <Section title="Carga con la forma del contenido">
          <div className="gallery-skeletons">
            <TableSkeleton columns={5} rows={3} />
            <CardsSkeleton count={2} />
            <FactsSkeleton rows={3} />
          </div>
        </Section>

        <Section title="Vacío" flush>
          <EmptyState illustration="search" title="Nada coincide con estos filtros" hint="Probá con otros filtros o limpialos." action={<button type="button" className="btn btn-secondary">Limpiar filtros</button>} />
        </Section>
      </div>
    </Screen>
  );
}
