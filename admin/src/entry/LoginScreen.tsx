import { useState, type FormEvent } from "react";
import { PasswordField } from "../../../src/components/AuthLayout/PasswordField";
import { Banner } from "../../../src/components/ui/Banner";
import { AdminApiError, errorText } from "../api/errors";
import { useSession } from "../session/session";
import { EntryLayout } from "./EntryLayout";

function loginError(error: unknown): string {
  if (error instanceof AdminApiError && error.status === 401) return "El email o la contraseña no son correctos.";
  return errorText(error);
}

export function LoginScreen({ notice }: { notice: string | null }) {
  const { signIn } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
    } catch (failure) {
      setError(loginError(failure));
      setBusy(false);
    }
  }

  return (
    <EntryLayout title="Entrar" subtitle="Usá tu email y tu contraseña de BoxLead. Después te pedimos el código de tu app de autenticación.">
      {notice ? <Banner tone="info">{notice}</Banner> : null}
      <form className="auth-form" onSubmit={submit}>
        {error ? (
          <div className="auth-error" role="alert">
            {error}
          </div>
        ) : null}
        <label className="auth-label">
          Email
          <input
            className="auth-input"
            type="email"
            name="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <PasswordField autoComplete="current-password" value={password} onChange={setPassword} />
        <button className="auth-submit" type="submit" disabled={busy}>
          {busy ? "Entrando…" : "Entrar"}
        </button>
      </form>
      <p className="auth-hint">Si ya tenés sesión abierta en boxlead.app entrás directo. Si no, usá tu email y tu contraseña.</p>
    </EntryLayout>
  );
}
