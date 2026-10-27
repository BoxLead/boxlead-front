import { useState } from "react";
import { Banner } from "../../../../src/components/ui/Banner";
import { Dialog } from "../../../../src/components/ui/Dialog";
import { DateText } from "../../components/DateText";
import { Screen } from "../../components/Screen";
import { Facts } from "../../components/Section";
import type { Column } from "../../components/list/DataTable";
import { DateFilter, FilterBar, SearchFilter, SelectFilter } from "../../components/list/Filters";
import { ListView } from "../../components/list/ListView";
import { useAdminQuery } from "../../components/list/useAdminQuery";
import type { AdminPage } from "../../api/types";
import { useListParams } from "../../components/list/useListParams";
import { navItem } from "../../nav";
import { ACTION_LABELS, ACTOR_LABELS, labelOf, optionsOf, TARGET_LABELS } from "./labels";
import type { AuditEvent } from "./types";
import { isDay, isUuid } from "./usage";
import "./Operations.css";

const KEYS = ["targetType", "targetId", "actorUserId", "action", "from", "to"] as const;
const TARGET_OPTIONS = optionsOf(TARGET_LABELS);
const ACTION_OPTIONS = optionsOf(ACTION_LABELS);

function json(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return JSON.stringify(value, null, 2);
}

function Snapshot({ label, value }: { label: string; value: unknown }) {
  const text = json(value);
  return (
    <figure className="audit-snapshot">
      <figcaption className="panel-title">{label}</figcaption>
      {text ? <pre className="audit-json">{text}</pre> : <p className="muted-text">Sin datos</p>}
    </figure>
  );
}

function Id({ value, full = false }: { value: string; full?: boolean }) {
  return (
    <code className="mono-text sub-text" title={full ? undefined : value}>
      {full ? value : value.slice(0, 8)}
    </code>
  );
}

function actor(event: AuditEvent, full = false) {
  return (
    <span className="cell-stack">
      <span>{ACTOR_LABELS[event.actorType] ?? event.actorType}</span>
      {event.actorUserId ? <Id value={event.actorUserId} full={full} /> : null}
    </span>
  );
}

function target(event: AuditEvent, full = false) {
  return (
    <span className="cell-stack">
      <span>{labelOf(TARGET_LABELS, event.targetType)}</span>
      <Id value={event.targetId} full={full} />
    </span>
  );
}

function EventDialog({ open, event, onClose }: { open: boolean; event: AuditEvent | null; onClose: () => void }) {
  return (
    <Dialog open={open} title={event ? labelOf(ACTION_LABELS, event.action) : "Cambio"} size="lg" onClose={onClose}>
      {event ? (
        <div className="audit-event">
          <Facts
            columns={2}
            items={[
              { label: "Fecha", value: <DateText value={event.occurredAt} time /> },
              { label: "Acción", value: <code className="mono-text">{event.action}</code> },
              { label: "Quién", value: actor(event, true) },
              { label: "Sobre qué", value: target(event, true) },
              { label: "Motivo", value: event.reason ?? "Sin motivo" },
              { label: "Dirección IP", value: event.ip ?? "Sin dato" },
              { label: "Pedido", value: event.requestId ? <code className="mono-text">{event.requestId}</code> : "Sin dato" },
            ]}
          />
          <div className="audit-snapshots">
            <Snapshot label="Antes" value={event.before} />
            <Snapshot label="Después" value={event.after} />
          </div>
          <div className="dialog-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}

function filterProblem(actorUserId: string, from: string, to: string): string | null {
  if (actorUserId && !isUuid(actorUserId)) return "El id del actor no tiene el formato correcto.";
  if (from && to && isDay(from) && isDay(to) && from > to) return "La fecha de inicio tiene que ser anterior a la de fin.";
  return null;
}

export function AuditScreen() {
  const item = navItem("audit");
  const params = useListParams(KEYS);
  const problem = filterProblem(params.value("actorUserId"), params.value("from"), params.value("to"));
  const query = useAdminQuery<AdminPage<AuditEvent>>(problem ? null : "/admin/audit", params.search);
  const [selected, setSelected] = useState<AuditEvent | null>(null);
  const [open, setOpen] = useState(false);

  function show(event: AuditEvent) {
    setSelected(event);
    setOpen(true);
  }

  const columns: Column<AuditEvent>[] = [
    { key: "when", header: "Fecha", type: "date", cell: (row) => <DateText value={row.occurredAt} time /> },
    { key: "action", header: "Acción", width: "sm", cell: (row) => labelOf(ACTION_LABELS, row.action) },
    { key: "actor", header: "Quién", width: "sm", cell: (row) => actor(row) },
    { key: "target", header: "Sobre qué", width: "sm", cell: (row) => target(row) },
    { key: "reason", header: "Motivo", width: "md", truncate: true, cell: (row) => row.reason ?? <span className="sub-text">Sin motivo</span> },
    {
      key: "changes",
      header: "Cambios",
      type: "actions",
      cell: (row) => (
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => show(row)}>
          Ver antes y después
        </button>
      ),
    },
  ];

  const filters = (
    <FilterBar active={params.active} onClear={params.clear}>
      <SelectFilter label="Acción" value={params.value("action")} options={ACTION_OPTIONS} allLabel="Todas" onChange={(value) => params.setFilter("action", value)} />
      <SelectFilter label="Tipo de objetivo" value={params.value("targetType")} options={TARGET_OPTIONS} onChange={(value) => params.setFilter("targetType", value)} />
      <SearchFilter label="Id del objetivo" value={params.value("targetId")} placeholder="Id exacto" onSubmit={(value) => params.setFilter("targetId", value)} />
      <SearchFilter label="Id del actor" value={params.value("actorUserId")} placeholder="Id de usuario" onSubmit={(value) => params.setFilter("actorUserId", value)} />
      <DateFilter label="Desde" value={params.value("from")} onChange={(value) => params.setFilter("from", value)} />
      <DateFilter label="Hasta" value={params.value("to")} onChange={(value) => params.setFilter("to", value)} />
    </FilterBar>
  );

  return (
    <Screen title={item.label} description="Cada acción del equipo, de los clientes y del sistema, de la más nueva a la más vieja.">
      {problem ? (
        <section className="list-view" aria-label="Auditoría">
          {filters}
          <Banner tone="warning" title="Revisá los filtros">
            {problem}
          </Banner>
        </section>
      ) : (
        <ListView<AuditEvent>
          caption="Auditoría"
          query={query}
          columns={columns}
          rowKey={(row) => row.id}
          filters={filters}
          filtered={params.active}
          onClearFilters={params.clear}
          emptyTitle="Todavía no hay acciones auditadas"
          onPageChange={params.setPage}
        />
      )}
      <EventDialog open={open} event={selected} onClose={() => setOpen(false)} />
    </Screen>
  );
}
