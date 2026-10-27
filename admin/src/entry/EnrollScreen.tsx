import { useState } from "react";
import { Banner } from "../../../src/components/ui/Banner";
import { errorText } from "../api/errors";
import { entryApi } from "../api/client";
import type { AdminMe } from "../api/types";
import { formatDateTime } from "../format";
import { useSession } from "../session/session";
import { CodeForm } from "./CodeForm";
import { EntryLayout } from "./EntryLayout";
import { QrCode } from "./QrCode";

function secretOf(uri: string): string {
  try {
    const secret = new URL(uri).searchParams.get("secret") ?? "";
    return secret.match(/.{1,4}/g)?.join(" ") ?? "";
  } catch {
    return "";
  }
}

export function EnrollScreen({ me }: { me: AdminMe }) {
  const { confirmEnrollment, signOut } = useSession();
  const [uri, setUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const response = await entryApi.startEnrollment();
      setUri(response.otpauthUri);
    } catch (failure) {
      setError(errorText(failure));
    } finally {
      setBusy(false);
    }
  }

  const signOutLink = (
    <button type="button" className="entry-link" onClick={() => void signOut()}>
      Entrar con otra cuenta
    </button>
  );

  return (
    <EntryLayout
      title="Configurá tu segundo factor"
      subtitle={`Para entrar al backoffice necesitás un código de una app de autenticación. Tenés tiempo hasta el ${formatDateTime(me.enrollmentOpenUntil)}.`}
    >
      {error ? <Banner tone="danger">{error}</Banner> : null}
      {uri ? (
        <>
          <ol className="entry-steps">
            <li>Escaneá el código con tu app de autenticación.</li>
            <li>Ingresá el código de 6 números que te muestra.</li>
          </ol>
          <QrCode value={uri} label="Código QR para tu app de autenticación" />
          <p className="entry-secret">
            Si no podés escanearlo, cargá esta clave a mano
            <code>{secretOf(uri)}</code>
          </p>
          <CodeForm
            submitLabel="Confirmar"
            lockedUntil={me.factorLockedUntil}
            onSubmit={confirmEnrollment}
            secondary={
              <button type="button" className="entry-link" onClick={() => void generate()} disabled={busy}>
                Generar otro código QR
              </button>
            }
          />
        </>
      ) : (
        <>
          <p className="auth-hint">
            El código QR se muestra una sola vez. Tené el teléfono a mano antes de generarlo.
          </p>
          <button type="button" className="auth-submit" onClick={() => void generate()} disabled={busy}>
            {busy ? "Generando…" : "Generar código QR"}
          </button>
        </>
      )}
      {signOutLink}
    </EntryLayout>
  );
}
