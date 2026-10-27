import { useId, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../../api/client";
import { ReasonDialog } from "../../components/ReasonDialog";
import { ResellerDirectoryNotice } from "../../components/ResellerDirectoryNotice";
import { DateText } from "../../components/DateText";
import { useResellerDirectory, type ResellerDirectory } from "../../session/resellerDirectory";
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

function resellerName(directory: ResellerDirectory, id: string): string {
  return directory.find(id)?.displayName ?? "Ver revendedor";
}

function optionLabel(reseller: ResellerOption): string {
  const status = RESELLER_STATUS[reseller.status];
  return status ? `${reseller.displayName}, ${status}` : reseller.displayName;
}

type CorrectDialogProps = {
  userId: string;
  current: Attribution | null;
  directory: ResellerDirectory;
  onClose: () => void;
  run: Run;
};

function CorrectDialog({ userId, current, directory, onClose, run }: CorrectDialogProps) {
  const [selected, setSelected] = useState("");
  const id = useId();
  const options = directory.resellers.filter((reseller) => reseller.id !== current?.resellerId);

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
          ? `Hoy lo refirió ${resellerName(directory, current.resellerId)}. La atribución nueva pasa a ser la vigente y la anterior queda en el historial. Las comisiones ya generadas quedan con el revendedor anterior. Las próximas van al nuevo.`
          : "Hoy nadie lo refirió. La atribución nueva pasa a ser la vigente."}
      </p>
      {directory.status === "loading" ? (
        <LoadingBlock rows={1} />
      ) : directory.status === "error" ? (
        <ResellerDirectoryNotice directory={directory} />
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
  const directory = useResellerDirectory();

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
                  {resellerName(directory, attribution.resellerId)}
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
      {attribution ? <ResellerDirectoryNotice directory={directory} /> : null}
      {resellerId ? (
        <p className="customer-note">
          Este usuario también es revendedor.{" "}
          <Link className="entity-link" to={`/revendedores/${resellerId}`}>
            Ver su ficha
          </Link>
        </p>
      ) : null}
      {dialogs.open === "correct" ? (
        <CorrectDialog userId={userId} current={attribution} directory={directory} onClose={dialogs.close} run={dialogs.run} />
      ) : null}
    </Section>
  );
}
