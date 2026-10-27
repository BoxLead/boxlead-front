import { useId, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../../api/client";
import type { AdminPage } from "../../api/types";
import { useAdminQuery, type QueryResult } from "../../components/list/useAdminQuery";
import { ReasonDialog } from "../../components/ReasonDialog";
import { DateText } from "../../components/DateText";
import { SOURCE_LABELS } from "./labels";
import { Facts, LoadingBlock, Muted, Section } from "./parts";
import type { Attribution, ResellerOption } from "./types";
import { invalid, useActionDialogs } from "./useActionDialogs";

type AttributionPanelProps = {
  userId: string;
  attribution: Attribution | null;
  resellerId: string | null;
  canOperate: boolean;
  onChanged: () => void;
};

type Run = (call: () => Promise<unknown>, message: string) => Promise<void>;

const RESELLER_STATUS: Record<string, string> = { SUSPENDED: "suspendido", CLOSED: "cerrado" };

function resellerName(resellers: QueryResult<AdminPage<ResellerOption>>, id: string): string {
  if (resellers.status !== "ready") return "Ver revendedor";
  return resellers.data.items.find((reseller) => reseller.id === id)?.displayName ?? "Ver revendedor";
}

function optionLabel(reseller: ResellerOption): string {
  const status = RESELLER_STATUS[reseller.status];
  return status ? `${reseller.displayName}, ${status}` : reseller.displayName;
}

type CorrectDialogProps = {
  userId: string;
  current: Attribution | null;
  resellers: QueryResult<AdminPage<ResellerOption>>;
  onClose: () => void;
  run: Run;
};

function CorrectDialog({ userId, current, resellers, onClose, run }: CorrectDialogProps) {
  const [selected, setSelected] = useState("");
  const id = useId();
  const options = resellers.status === "ready" ? resellers.data.items.filter((reseller) => reseller.id !== current?.resellerId) : [];

  function confirm(reason: string) {
    if (!selected) invalid("Elegí el revendedor.");
    return run(
      () => adminApi.post(`/admin/customers/${userId}/attribution`, { resellerId: selected, reason }),
      "Corregimos la atribución.",
    );
  }

  return (
    <ReasonDialog open title="Corregir atribución" confirmLabel="Corregir" onClose={onClose} onConfirm={confirm}>
      <p>
        {current
          ? `Hoy lo refirió ${resellerName(resellers, current.resellerId)}. La atribución nueva pasa a ser la vigente y la anterior queda en el historial.`
          : "Hoy nadie lo refirió. La atribución nueva pasa a ser la vigente."}
      </p>
      {resellers.status === "loading" ? (
        <LoadingBlock rows={1} />
      ) : resellers.status === "error" ? (
        <Muted>No pudimos cargar los revendedores. {resellers.message}</Muted>
      ) : options.length === 0 ? (
        <Muted>No hay otro revendedor para elegir.</Muted>
      ) : (
        <div className="field">
          <label className="field-label" htmlFor={id}>
            Revendedor
          </label>
          <select id={id} className="select" value={selected} onChange={(event) => setSelected(event.target.value)}>
            <option value="">Elegí uno</option>
            {options.map((reseller) => (
              <option key={reseller.id} value={reseller.id}>
                {optionLabel(reseller)}
              </option>
            ))}
          </select>
        </div>
      )}
    </ReasonDialog>
  );
}

export function AttributionPanel({ userId, attribution, resellerId, canOperate, onChanged }: AttributionPanelProps) {
  const dialogs = useActionDialogs<"correct">(onChanged);
  const resellers = useAdminQuery<AdminPage<ResellerOption>>("/admin/resellers");

  const actions = canOperate ? (
    <button type="button" className="btn btn-secondary btn-sm" onClick={() => dialogs.show("correct")}>
      {attribution ? "Corregir atribución" : "Asignar revendedor"}
    </button>
  ) : null;

  return (
    <Section title="Quién lo refirió" actions={actions} wide>
      {attribution ? (
        <Facts
          columns={2}
          items={[
            {
              label: "Revendedor",
              value: (
                <Link className="entity-link" to={`/revendedores/${attribution.resellerId}`}>
                  {resellerName(resellers, attribution.resellerId)}
                </Link>
              ),
            },
            { label: "Origen", value: SOURCE_LABELS[attribution.source] },
            { label: "Desde", value: <DateText value={attribution.createdAt} time /> },
            attribution.sequence > 1 ? { label: "Correcciones", value: String(attribution.sequence - 1) } : null,
            attribution.reason ? { label: "Motivo", value: attribution.reason } : null,
          ]}
        />
      ) : (
        <Muted>Nadie lo refirió.</Muted>
      )}
      {resellerId ? (
        <p className="customer-note">
          Este usuario también es revendedor.{" "}
          <Link className="entity-link" to={`/revendedores/${resellerId}`}>
            Ver su ficha
          </Link>
        </p>
      ) : null}
      {dialogs.open === "correct" ? (
        <CorrectDialog userId={userId} current={attribution} resellers={resellers} onClose={dialogs.close} run={dialogs.run} />
      ) : null}
    </Section>
  );
}
