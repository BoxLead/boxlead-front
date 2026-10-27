import { useState } from "react";
import { useToast } from "../../../../src/components/ui/toast";
import { ReasonDialog } from "../../components/ReasonDialog";
import { useResellerDirectory } from "../../session/resellerDirectory";
import { formatDate } from "../../format";
import { createInvitation } from "./api";
import { endOfDay, todayInBuenosAires } from "./dates";
import { Field, FormDialog, Summary } from "./FormDialog";
import { InvitationLinkDialog } from "./InvitationLinkDialog";
import { daysText, demoDaysProblem, demoDaysValue, emailProblem, futureDayProblem } from "./validation";
import { MAX_DEMO_DAYS, MAX_EMAIL_LENGTH } from "./types";

type Draft = { email: string; expiresOn: string; demoDays: string; resellerId: string };

type Step = "form" | "confirm" | "closed";

const EMPTY: Draft = { email: "", expiresOn: "", demoDays: "", resellerId: "" };

type CreateInvitationFlowProps = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
};

export function CreateInvitationFlow({ open, onClose, onCreated }: CreateInvitationFlowProps) {
  const toast = useToast();
  const resellers = useResellerDirectory();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [step, setStep] = useState<Step>("form");
  const [touched, setTouched] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setDraft(EMPTY);
      setStep("form");
      setTouched(false);
    }
  }

  const problems = {
    email: emailProblem(draft.email),
    expiresOn: futureDayProblem(draft.expiresOn),
    demoDays: demoDaysProblem(draft.demoDays),
  };
  const shown = (problem: string | null) => (touched ? problem : null);
  const resellerName = resellers.find(draft.resellerId)?.displayName;
  const active = resellers.resellers.filter((reseller) => reseller.status === "ACTIVE");

  function update(change: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...change }));
  }

  function next() {
    setTouched(true);
    if (problems.email || problems.expiresOn || problems.demoDays) return;
    setStep("confirm");
  }

  async function confirm(reason: string) {
    const email = draft.email.trim();
    const created = await createInvitation(
      {
        email,
        expiresAt: endOfDay(draft.expiresOn),
        demoDays: demoDaysValue(draft.demoDays),
        resellerId: draft.resellerId || null,
      },
      reason,
    );
    setStep("closed");
    onCreated();
    if (created.link) {
      setLink(created.link);
    } else {
      toast({ tone: "success", message: `Creamos la invitación. Le llega por email a ${email}.` });
      onClose();
    }
  }

  function closeLink() {
    setLink(null);
    onClose();
  }

  return (
    <>
      <FormDialog
        open={open && step === "form"}
        title="Nueva invitación"
        description="La persona entra con este email y arranca su Demo al crear la cuenta."
        submitLabel="Continuar"
        onSubmit={next}
        onClose={onClose}
      >
        <Field label="Email" error={shown(problems.email)}>
          {(props) => (
            <input
              {...props}
              className="input"
              type="email"
              autoComplete="off"
              maxLength={MAX_EMAIL_LENGTH}
              value={draft.email}
              onChange={(event) => update({ email: event.target.value })}
            />
          )}
        </Field>
        <Field label="La invitación vence el" help="Vence al terminar ese día, hora de Buenos Aires." error={shown(problems.expiresOn)}>
          {(props) => (
            <input
              {...props}
              className="input"
              type="date"
              min={todayInBuenosAires()}
              value={draft.expiresOn}
              onChange={(event) => update({ expiresOn: event.target.value })}
            />
          )}
        </Field>
        <Field label="Días de Demo" help="Opcional. Si lo dejás vacío usa la duración del plan Demo." error={shown(problems.demoDays)}>
          {(props) => (
            <input
              {...props}
              className="input"
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_DEMO_DAYS}
              value={draft.demoDays}
              onChange={(event) => update({ demoDays: event.target.value })}
            />
          )}
        </Field>
        <Field
          label="Revendedor"
          help={
            resellers.status === "error"
              ? `No pudimos cargar los revendedores. ${resellers.message} Podés seguir sin revendedor.`
              : "Opcional. Solo aparecen los revendedores activos."
          }
        >
          {(props) => (
            <select
              {...props}
              className="select"
              disabled={resellers.status !== "ready"}
              value={draft.resellerId}
              onChange={(event) => update({ resellerId: event.target.value })}
            >
              <option value="">{resellers.status === "loading" ? "Cargando revendedores…" : "Sin revendedor"}</option>
              {active.map((reseller) => (
                <option key={reseller.id} value={reseller.id}>
                  {reseller.displayName}
                </option>
              ))}
            </select>
          )}
        </Field>
      </FormDialog>
      <ReasonDialog
        open={open && step === "confirm"}
        title="Crear invitación"
        confirmLabel="Crear invitación"
        onConfirm={confirm}
        onClose={() => setStep("form")}
      >
        <Summary
          rows={[
            ["Email", draft.email.trim()],
            ["Vence", formatDate(draft.expiresOn)],
            ["Demo", daysText(demoDaysValue(draft.demoDays))],
            ["Revendedor", resellerName ?? "Sin revendedor"],
          ]}
        />
        <p>Si el envío de emails está prendido le llega por email. Si no, te mostramos el link una sola vez para que se lo mandes.</p>
      </ReasonDialog>
      <InvitationLinkDialog link={link} onClose={closeLink} />
    </>
  );
}
