import { useState } from "react";
import { useToast } from "../../../../src/components/ui/toast";
import { ReasonDialog } from "../../components/ReasonDialog";
import { formatDate } from "../../format";
import { extendDemo } from "./api";
import { addDays, dayInBuenosAires, endOfDay, todayInBuenosAires } from "./dates";
import { Field, FormDialog, Summary } from "./FormDialog";
import { userLabel, type DemoGrant } from "./types";
import { futureDayProblem } from "./validation";

type ExtendDemoFlowProps = {
  grant: DemoGrant | null;
  onClose: () => void;
  onExtended: () => void;
};

export function ExtendDemoFlow({ grant, onClose, onExtended }: ExtendDemoFlowProps) {
  const toast = useToast();
  const [day, setDay] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [touched, setTouched] = useState(false);
  const [shownGrant, setShownGrant] = useState(grant);
  if (grant !== shownGrant) {
    setShownGrant(grant);
    setDay("");
    setConfirming(false);
    setTouched(false);
  }

  const currentEnd = grant ? dayInBuenosAires(grant.endsAt) : "";
  const today = todayInBuenosAires();
  const after = currentEnd >= today ? currentEnd : undefined;
  const problem = futureDayProblem(day, after);

  function next() {
    setTouched(true);
    if (!problem) setConfirming(true);
  }

  async function confirm(reason: string) {
    if (!grant) return;
    await extendDemo(grant.userId, endOfDay(day), reason);
    toast({ tone: "success", message: `La Demo de ${userLabel(grant)} ahora termina el ${formatDate(day)}.` });
    onExtended();
    onClose();
  }

  return (
    <>
      <FormDialog
        open={grant !== null && !confirming}
        title="Extender Demo"
        description={grant ? `${userLabel(grant)} tiene la Demo hasta el ${formatDate(grant.endsAt)}.` : undefined}
        submitLabel="Continuar"
        onSubmit={next}
        onClose={onClose}
      >
        <Field label="Nuevo fin" help="Termina al cerrar ese día, hora de Buenos Aires." error={touched ? problem : null}>
          {(props) => (
            <input
              {...props}
              className="input"
              type="date"
              min={after ? addDays(after, 1) : today}
              value={day}
              onChange={(event) => setDay(event.target.value)}
            />
          )}
        </Field>
      </FormDialog>
      <ReasonDialog
        open={grant !== null && confirming}
        title="Extender Demo"
        confirmLabel="Extender"
        onConfirm={confirm}
        onClose={() => setConfirming(false)}
      >
        {grant ? (
          <Summary
            rows={[
              ["Usuario", userLabel(grant)],
              ["Fin actual", formatDate(grant.endsAt)],
              ["Nuevo fin", formatDate(day)],
            ]}
          />
        ) : null}
        {grant?.status === "ENDED" ? <p>La Demo ya había terminado y vuelve a estar vigente hasta el nuevo fin.</p> : null}
      </ReasonDialog>
    </>
  );
}
