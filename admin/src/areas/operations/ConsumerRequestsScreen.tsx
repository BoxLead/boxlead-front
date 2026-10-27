import { useId, useState } from "react";
import { Link } from "react-router-dom";
import { CharCounter } from "../../../../src/components/ui/CharCounter";
import { ChoiceGroup } from "../../../../src/components/ui/ChoiceGroup";
import { adminApi } from "../../api/client";
import { AdminApiError, isStale } from "../../api/errors";
import { DateText } from "../../components/DateText";
import { ReasonDialog } from "../../components/ReasonDialog";
import { Screen } from "../../components/Screen";
import { StatusBadge } from "../../components/StatusBadge";
import type { Column } from "../../components/list/DataTable";
import { FilterBar } from "../../components/list/Filters";
import { ListView } from "../../components/list/ListView";
import type { FilterRules } from "../../components/list/filterRules";
import { useListQuery } from "../../components/list/useListQuery";
import { formatDateTime } from "../../format";
import { navItem } from "../../nav";
import { canAccess } from "../../session/roles";
import { useAdmin } from "../../session/session";
import { REQUEST_KIND, type StatusLabel } from "../../status";
import { KIND_LABELS, REQUEST_STATUS_LABELS } from "./labels";
import type { ConsumerRequest, ConsumerRequestDecision, ConsumerRequestStatus } from "./types";
import { UserLink } from "./UserLink";
import "./Operations.css";

const KEYS = ["status"] as const;
const STATUSES: readonly ConsumerRequestStatus[] = ["RECEIVED", "RESOLVED", "REJECTED"];
const RULES: FilterRules = { status: { kind: "enum", values: STATUSES } };
const MAX_RESOLUTION = 1000;

const RECEIPT_QUEUED: StatusLabel = { label: "En cola", tone: "success" };
const RECEIPT_NOT_SENT: StatusLabel = { label: "Sin enviar", tone: "neutral" };

const EMPTY: Record<ConsumerRequestStatus, string> = {
  RECEIVED: "No hay pedidos pendientes",
  RESOLVED: "Todavía no hay pedidos resueltos",
  REJECTED: "Todavía no hay pedidos rechazados",
};

function alreadyClosed(error: unknown): never {
  if (error instanceof AdminApiError && error.code === null && error.status === 409) {
    throw new AdminApiError("Ese pedido ya fue cerrado. Cerrá este diálogo para ver la lista al día.", 409, null);
  }
  if (error instanceof AdminApiError && error.status === 404) {
    throw new AdminApiError("Ese pedido ya no existe. Cerrá este diálogo para ver la lista al día.", 404, error.code);
  }
  throw error;
}

function canResolve(roles: Parameters<typeof canAccess>[0], request: ConsumerRequest): boolean {
  return canAccess(roles, request.kind === "WITHDRAWAL" ? ["FINANCE"] : ["SUPPORT", "FINANCE"]);
}

function Effect({ request, decision }: { request: ConsumerRequest; decision: ConsumerRequestDecision }) {
  if (decision === "REJECTED") {
    return <p>Rechazar solo cierra el pedido. No cancela la suscripción ni reembolsa nada.</p>;
  }
  if (request.kind === "CANCELLATION") {
    return (
      <p>
        Resolver la baja cancela la suscripción vigente al final del período pago, así el cliente sigue usando BoxLead hasta esa
        fecha. Si no tiene una suscripción activa o ya había pedido la baja, solo cierra el pedido.
      </p>
    );
  }
  return (
    <>
      <p>
        Reembolsa el último pago aprobado y cancela la suscripción en el acto. Si no hay pago cobrado, la cancela al final del
        período.
      </p>
      {request.refundable ? null : <p>No hay pago para reembolsar.</p>}
    </>
  );
}

type ResolveDialogProps = { request: ConsumerRequest; onClose: () => void; onDone: () => void; onStale: () => void };

function ResolveDialog({ request, onClose, onDone, onStale }: ResolveDialogProps) {
  const [decision, setDecision] = useState<ConsumerRequestDecision>("RESOLVED");
  const [resolution, setResolution] = useState("");
  const [touched, setTouched] = useState(false);
  const fieldId = useId();
  const helpId = useId();
  const counterId = useId();
  const text = resolution.trim();
  const problem = text.length === 0 ? "Escribí la respuesta para el cliente." : text.length > MAX_RESOLUTION ? `Puede tener hasta ${MAX_RESOLUTION} caracteres.` : null;

  async function confirm(reason: string) {
    setTouched(true);
    if (problem) throw new AdminApiError(problem, 400, null);
    await adminApi
      .post<ConsumerRequest>(`/admin/consumer-requests/${request.id}/resolve`, { status: decision, resolution: text, reason })
      .catch(alreadyClosed);
    onDone();
  }

  const kind = KIND_LABELS[request.kind].toLowerCase();
  const refunds = decision === "RESOLVED" && request.kind === "WITHDRAWAL";
  return (
    <ReasonDialog
      open
      title={`Cerrar el pedido ${request.code}`}
      confirmLabel={decision === "RESOLVED" ? `Resolver ${kind}` : "Rechazar pedido"}
      tone={refunds ? "danger" : "primary"}
      amount={refunds ? (request.refundable ?? undefined) : undefined}
      onConfirm={confirm}
      onClose={onClose}
      onSettled={(failure) => {
        if (isStale(failure)) onStale();
      }}
    >
      <p>
        Pedido de {kind} de <strong>{request.email}</strong>, recibido el {formatDateTime(request.createdAt)}.
      </p>
      {request.details ? (
        <figure className="ops-details">
          <figcaption className="field-label">Lo que escribió el cliente</figcaption>
          <blockquote className="ops-details-text">{request.details}</blockquote>
        </figure>
      ) : (
        <p className="muted-text">El cliente no dejó detalle.</p>
      )}
      <div className="ops-choice">
        <ChoiceGroup<ConsumerRequestDecision>
          label="Decisión"
          variant="segmented"
          value={decision}
          onChange={setDecision}
          choices={[
            { value: "RESOLVED", label: "Resolver" },
            { value: "REJECTED", label: "Rechazar" },
          ]}
        />
      </div>
      <Effect request={request} decision={decision} />
      <p>Le mandamos al cliente el comprobante con el código, el tipo, tu respuesta y la fecha. Un pedido se cierra una sola vez.</p>
      <div className="field">
        <label className="field-label" htmlFor={fieldId}>
          Respuesta para el cliente
        </label>
        <textarea
          id={fieldId}
          className="input ops-textarea"
          name="resolution"
          rows={3}
          maxLength={MAX_RESOLUTION}
          value={resolution}
          aria-invalid={touched && problem ? true : undefined}
          aria-describedby={`${helpId} ${counterId}`}
          onChange={(event) => setResolution(event.target.value)}
          onBlur={() => setTouched(true)}
        />
        <div className="ops-field-meta">
          <span id={helpId} className={touched && problem ? "field-error" : "field-help"}>
            {touched && problem ? problem : "Va en el email del comprobante."}
          </span>
          <CharCounter id={counterId} length={resolution.length} max={MAX_RESOLUTION} />
        </div>
      </div>
    </ReasonDialog>
  );
}

export function ConsumerRequestsScreen() {
  const item = navItem("consumer-requests");
  const me = useAdmin();
  const { params, query } = useListQuery<ConsumerRequest>("/admin/consumer-requests", KEYS, RULES);
  const status = STATUSES.find((value) => value === params.value("status")) ?? "RECEIVED";
  const [resolving, setResolving] = useState<ConsumerRequest | null>(null);

  const columns: Column<ConsumerRequest>[] = [
    { key: "code", header: "Pedido", type: "id", cell: (row) => <code className="mono-text">{row.code}</code> },
    { key: "kind", header: "Tipo", type: "status", cell: (row) => <StatusBadge status={REQUEST_KIND[row.kind]} /> },
    {
      key: "customer",
      header: "Cliente",
      width: "md",
      cell: (row) =>
        row.userId ? (
          <Link className="entity-link" to={`/usuarios/${row.userId}`}>
            {row.email}
          </Link>
        ) : (
          <span className="cell-stack">
            <span>{row.email}</span>
            <span className="sub-text">Sin cuenta en BoxLead</span>
          </span>
        ),
    },
    { key: "details", header: "Detalle", width: "sm", truncate: true, cell: (row) => row.details || <span className="sub-text">Sin detalle</span> },
    { key: "created", header: "Recibido", type: "date", cell: (row) => <DateText value={row.createdAt} time /> },
  ];

  if (status === "RECEIVED") {
    columns.push({
      key: "action",
      header: "Acción",
      type: "actions",
      cell: (row) =>
        row.userId === me.userId && !me.roles.includes("OWNER") ? (
          <span className="sub-text">Es tu cuenta</span>
        ) : canResolve(me.roles, row) ? (
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setResolving(row)}>
            Cerrar pedido
          </button>
        ) : (
          <span className="sub-text">Lo cierra Finanzas</span>
        ),
    });
  } else {
    columns.push(
      {
        key: "resolution",
        header: "Respuesta",
        width: "md",
        cell: (row) => (
          <span className="cell-stack">
            <span>{row.resolution}</span>
            <span className="sub-text">{formatDateTime(row.resolvedAt)}</span>
            {row.resolvedBy ? (
              <span className="sub-text">
                Lo cerró <UserLink id={row.resolvedBy} />
              </span>
            ) : null}
          </span>
        ),
      },
      {
        key: "receipt",
        header: "Comprobante",
        type: "status",
        cell: (row) =>
          row.receiptSentAt ? (
            <span className="cell-stack">
              <StatusBadge status={RECEIPT_QUEUED} />
              <span className="sub-text">{formatDateTime(row.receiptSentAt)}</span>
            </span>
          ) : (
            <StatusBadge status={RECEIPT_NOT_SENT} />
          ),
      },
    );
  }

  return (
    <Screen title={item.label} description="Pedidos de arrepentimiento y de baja que llegan desde la web. Los pendientes salen del más viejo al más nuevo.">
      <ListView<ConsumerRequest>
        caption={`Pedidos ${REQUEST_STATUS_LABELS[status].toLowerCase()}`}
        query={query}
        columns={columns}
        rowKey={(row) => row.id}
        filters={
          <FilterBar
            lead={
              <ChoiceGroup<ConsumerRequestStatus>
                label="Estado"
                variant="segmented"
                value={status}
                onChange={(value) => params.setFilter("status", value === "RECEIVED" ? null : value)}
                choices={STATUSES.map((value) => ({ value, label: REQUEST_STATUS_LABELS[value] }))}
              />
            }
          />
        }
        emptyTitle={EMPTY[status]}
        emptyHint={status === "RECEIVED" ? "Cuando un cliente use el botón de arrepentimiento o de baja, aparece acá." : undefined}
        onPageChange={params.setPage}
      />
      {resolving ? (
        <ResolveDialog
          key={resolving.id}
          request={resolving}
          onClose={() => setResolving(null)}
          onDone={() => {
            setResolving(null);
            query.reload();
          }}
          onStale={query.reload}
        />
      ) : null}
    </Screen>
  );
}
