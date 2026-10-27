import { useId, useState } from "react";
import { Tag } from "../../../../src/components/ui/Tag";
import { adminApi } from "../../api/client";
import { ReasonDialog } from "../../components/ReasonDialog";
import { formatDate, formatDateTime } from "../../format";
import { addDays, dayOf, endOfDay, isDay, today } from "./dates";
import { Facts, Muted, Section } from "./parts";
import type { DemoGrant } from "./types";
import { invalid, useActionDialogs } from "./useActionDialogs";

export const MAX_DEMO_DAYS = 365;

type DemoPanelProps = {
  userId: string;
  demo: DemoGrant | null;
  canOperate: boolean;
  onChanged: () => void;
};

type Dialog = "grant" | "extend" | "revoke";
type Run = (call: () => Promise<unknown>, message: string) => Promise<void>;

function running(demo: DemoGrant): boolean {
  return Date.parse(demo.endsAt) > Date.now();
}

function GrantDialog({ userId, open, onClose, run }: { userId: string; open: boolean; onClose: () => void; run: Run }) {
  const [days, setDays] = useState("");
  const id = useId();

  function confirm(reason: string) {
    const trimmed = days.trim();
    const demoDays = trimmed === "" ? null : Number(trimmed);
    if (demoDays !== null && (!Number.isInteger(demoDays) || demoDays < 1 || demoDays > MAX_DEMO_DAYS)) {
      invalid(`Los días tienen que ser un número entero de 1 a ${MAX_DEMO_DAYS}.`);
    }
    const body = demoDays === null ? { reason } : { demoDays, reason };
    return run(() => adminApi.post(`/admin/customers/${userId}/demo`, body), "Le otorgamos la Demo.");
  }

  return (
    <ReasonDialog open={open} title="Otorgar Demo" confirmLabel="Otorgar Demo" onClose={onClose} onConfirm={confirm}>
      <p>La Demo arranca ahora. Mientras no se quite, se puede extender pero no otorgar otra.</p>
      <div className="field">
        <label className="field-label" htmlFor={id}>
          Días de Demo
        </label>
        <input
          id={id}
          className="input"
          type="number"
          inputMode="numeric"
          min={1}
          max={MAX_DEMO_DAYS}
          value={days}
          onChange={(event) => setDays(event.target.value)}
        />
        <span className="field-help">Vacío usa la duración del plan Demo.</span>
      </div>
    </ReasonDialog>
  );
}

function ExtendDialog({
  userId,
  demo,
  open,
  onClose,
  run,
}: {
  userId: string;
  demo: DemoGrant;
  open: boolean;
  onClose: () => void;
  run: Run;
}) {
  const tomorrow = addDays(today(), 1);
  const current = dayOf(demo.endsAt);
  const [day, setDay] = useState(current > tomorrow ? addDays(current, 7) : addDays(tomorrow, 6));
  const id = useId();

  function confirm(reason: string) {
    if (!isDay(day) || day < tomorrow) invalid("Elegí un día a partir de mañana.");
    return run(() => adminApi.post(`/admin/customers/${userId}/demo/extend`, { endsAt: endOfDay(day), reason }), "Extendimos la Demo.");
  }

  return (
    <ReasonDialog open={open} title="Extender Demo" confirmLabel="Extender" onClose={onClose} onConfirm={confirm}>
      <p>Hoy termina el {formatDate(demo.endsAt)}. Pasa a terminar al final del día que elijas, en hora de Argentina.</p>
      <div className="field">
        <label className="field-label" htmlFor={id}>
          Nuevo fin
        </label>
        <input id={id} className="input" type="date" min={tomorrow} value={day} onChange={(event) => setDay(event.target.value)} />
      </div>
    </ReasonDialog>
  );
}

export function DemoPanel({ userId, demo, canOperate, onChanged }: DemoPanelProps) {
  const dialogs = useActionDialogs<Dialog>(onChanged);

  const actions = canOperate ? (
    demo ? (
      <>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => dialogs.show("extend")}>
          Extender
        </button>
        <button type="button" className="btn btn-danger btn-sm" onClick={() => dialogs.show("revoke")}>
          Quitar Demo
        </button>
      </>
    ) : (
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => dialogs.show("grant")}>
        Otorgar Demo
      </button>
    )
  ) : null;

  return (
    <Section title="Demo" actions={actions}>
      {demo ? (
        <Facts
          items={[
            { label: "Estado", value: running(demo) ? <Tag tone="success">Vigente</Tag> : <Tag>Terminada</Tag> },
            { label: "Empezó", value: formatDateTime(demo.startsAt) },
            { label: running(demo) ? "Termina" : "Terminó", value: formatDateTime(demo.endsAt) },
            { label: "Origen", value: demo.invitationId ? "Invitación" : "La otorgó el equipo" },
          ]}
        />
      ) : (
        <Muted>No tiene Demo.</Muted>
      )}
      <GrantDialog userId={userId} open={dialogs.open === "grant"} onClose={dialogs.close} run={dialogs.run} />
      {demo ? (
        <>
          {dialogs.open === "extend" ? <ExtendDialog userId={userId} demo={demo} open onClose={dialogs.close} run={dialogs.run} /> : null}
          <ReasonDialog
            open={dialogs.open === "revoke"}
            title="Quitar Demo"
            confirmLabel="Quitar Demo"
            tone="danger"
            onClose={dialogs.close}
            onConfirm={(reason) =>
              dialogs.run(() => adminApi.post(`/admin/customers/${userId}/demo/revoke`, { reason }), "Le quitamos la Demo.")
            }
          >
            <p>La Demo termina ahora. Si no tiene una suscripción, el acceso queda restringido. Después se le puede otorgar otra.</p>
          </ReasonDialog>
        </>
      ) : null}
    </Section>
  );
}
