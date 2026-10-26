import { useId, useState, type FormEvent, type ReactNode } from "react";
import { Banner } from "../../../src/components/ui/Banner";
import { AdminApiError, errorText } from "../api/errors";
import { formatTime } from "../format";
import { CodeField } from "./CodeField";
import { isCompleteCode } from "./code";
import { useLock } from "./useLock";

type CodeFormProps = {
  submitLabel: string;
  lockedUntil: string | null;
  onSubmit: (code: string) => Promise<void>;
  secondary?: ReactNode;
};

export function CodeForm({ submitLabel, lockedUntil, onSubmit, secondary }: CodeFormProps) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locked = useLock(lockedUntil);
  const errorId = useId();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isCompleteCode(code)) {
      setError("El código tiene 6 números.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSubmit(code);
    } catch (failure) {
      const lockedNow = failure instanceof AdminApiError && failure.code === "MFA_LOCKED";
      setError(lockedNow ? null : errorText(failure));
      setCode("");
      setBusy(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit} noValidate>
      {locked && lockedUntil ? (
        <Banner tone="warning" title="El factor está bloqueado">
          Hubo demasiados códigos incorrectos seguidos. Podés probar de nuevo a las {formatTime(lockedUntil)}.
        </Banner>
      ) : null}
      {error ? (
        <div className="auth-error" role="alert" id={errorId}>
          {error}
        </div>
      ) : null}
      <CodeField
        value={code}
        onChange={setCode}
        disabled={busy || locked}
        invalid={Boolean(error)}
        describedBy={error ? errorId : undefined}
        autoFocus
      />
      <button className="auth-submit" type="submit" disabled={busy || locked}>
        {busy ? "Revisando…" : submitLabel}
      </button>
      {secondary}
    </form>
  );
}
