import { useId, useState } from "react";
import { Link } from "react-router-dom";
import { CharCounter } from "../../../../src/components/ui/CharCounter";
import { ChoiceGroup } from "../../../../src/components/ui/ChoiceGroup";
import { Tag } from "../../../../src/components/ui/Tag";
import { adminApi } from "../../api/client";
import { AdminApiError } from "../../api/errors";
import { ReasonDialog } from "../../components/ReasonDialog";
import { Screen } from "../../components/Screen";
import type { Column } from "../../components/list/DataTable";
import { ListView } from "../../components/list/ListView";
import { useListQuery } from "../../components/list/useListQuery";
import { formatDateTime } from "../../format";
import { navItem } from "../../nav";
import { canAccess } from "../../session/roles";
import { useAdmin } from "../../session/session";
import { KIND_LABELS, REQUEST_STATUS_LABELS } from "./labels";
import type { ConsumerRequest, ConsumerRequestDecision, ConsumerRequestStatus } from "./types";
import "./Operations.css";

const KEYS = ["status"] as const;
const STATUSES: readonly ConsumerRequestStatus[] = ["RECEIVED", "RESOLVED", "REJECTED"];
const MAX_RESOLUTION = 1000;

const EMPTY: Record<ConsumerRequestStatus, string> = {
  RECEIVED: "No hay pedidos pendientes",
  RESOLVED: "Todavía no hay pedidos resueltos",
  REJECTED: "Todavía no hay pedidos rechazados",
};

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
        Resolver el arrepentimiento cancela la suscripción al final del período y reembolsa completo el último pago aprobado en
        Mercado Pago. Si no hay un pago cobrado, solo cancela.
      </p>
      <p>
        {request.userId ? (
          <>
            Mirá el monto en el <Link to={`/usuarios/${request.userId}`}>detalle del cliente</Link> antes de confirmar.
          </>
        ) : (
          "Este pedido no tiene una cuenta asociada, así que no hay nada para reembolsar."
        )}
      </p>
    </>
  );
}

function ResolveDialog({ request, onClose, onDone }: { request: ConsumerRequest; onClose: () => void; onDone: () => void }) {
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
    await adminApi.post<ConsumerRequest>(`/admin/consumer-requests/${request.id}/resolve`, { status: decision, resolution: text, reason });
    onDone();
  }

  const kind = KIND_LABELS[request.kind].toLowerCase();
  return (
    <ReasonDialog
      open
      title={`Cerrar el pedido ${request.code}`}
      confirmLabel={decision === "RESOLVED" ? `Resolver ${kind}` : "Rechazar pedido"}
      tone={decision === "RESOLVED" && request.kind === "WITHDRAWAL" ? "danger" : "primary"}
      onConfirm={confirm}
      onClose={onClose}
    >
      <p>
        Pedido de {kind} de <strong>{request.email}</strong>, recibido el {formatDateTime(request.createdAt)}.
      </p>
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
  const { params, query } = useListQuery<ConsumerRequest>("/admin/consumer-requests", KEYS);
  const status = STATUSES.find((value) => value === params.value("status")) ?? "RECEIVED";
  const [resolving, setResolving] = useState<ConsumerRequest | null>(null);

  const columns: Column<ConsumerRequest>[] = [
    {
      key: "request",
      header: "Pedido",
      cell: (row) => (
        <span className="ops-stack">
          <code className="ops-code">{row.code}</code>
          <Tag tone={row.kind === "WITHDRAWAL" ? "warning" : "neutral"}>{KIND_LABELS[row.kind]}</Tag>
        </span>
      ),
    },
    {
      key: "customer",
      header: "Cliente",
      cell: (row) => (
        <span className="ops-stack">
          <span>{row.email}</span>
          {row.userId ? (
            <Link className="ops-link" to={`/usuarios/${row.userId}`}>
              Ver cliente
            </Link>
          ) : (
            <span className="ops-muted">Sin cuenta en BoxLead</span>
          )}
        </span>
      ),
    },
    { key: "details", header: "Detalle", cell: (row) => row.details || <span className="ops-muted">Sin detalle</span> },
    { key: "created", header: "Recibido", cell: (row) => formatDateTime(row.createdAt) },
  ];

  if (status === "RECEIVED") {
    columns.push({
      key: "action",
      header: "Acción",
      cell: (row) =>
        canResolve(me.roles, row) ? (
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setResolving(row)}>
            Cerrar pedido
          </button>
        ) : (
          <span className="ops-muted">Lo cierra Finanzas</span>
        ),
    });
  } else {
    columns.push(
      {
        key: "resolution",
        header: "Respuesta",
        cell: (row) => (
          <span className="ops-stack">
            <span>{row.resolution}</span>
            <span className="ops-muted">{formatDateTime(row.resolvedAt)}</span>
          </span>
        ),
      },
      {
        key: "receipt",
        header: "Comprobante",
        cell: (row) =>
          row.receiptSentAt ? (
            <span className="ops-stack">
              <Tag tone="success">En cola</Tag>
              <span className="ops-muted">{formatDateTime(row.receiptSentAt)}</span>
            </span>
          ) : (
            <Tag>Pendiente</Tag>
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
          <div className="ops-switch">
            <ChoiceGroup<ConsumerRequestStatus>
              label="Estado"
              variant="segmented"
              value={status}
              onChange={(value) => params.setFilter("status", value === "RECEIVED" ? null : value)}
              choices={STATUSES.map((value) => ({ value, label: REQUEST_STATUS_LABELS[value] }))}
            />
          </div>
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
        />
      ) : null}
    </Screen>
  );
}
