import { Banner } from "../../../src/components/ui/Banner";
import type { AdminMe } from "../api/types";
import { useSession } from "../session/session";
import { CodeForm } from "./CodeForm";
import { EntryLayout } from "./EntryLayout";

export function CodeScreen({ me, enrolled }: { me: AdminMe; enrolled: boolean }) {
  const { openSession, signOut } = useSession();
  return (
    <EntryLayout title="Código de verificación" subtitle="Abrí tu app de autenticación e ingresá el código de BoxLead.">
      {enrolled ? (
        <Banner tone="success" title="Tu factor quedó configurado">
          Esperá a que la app muestre un código nuevo e ingresalo para abrir la sesión.
        </Banner>
      ) : null}
      <CodeForm
        submitLabel="Abrir sesión"
        lockedUntil={me.factorLockedUntil}
        onSubmit={openSession}
        secondary={
          <button type="button" className="entry-link" onClick={() => void signOut()}>
            Entrar con otra cuenta
          </button>
        }
      />
    </EntryLayout>
  );
}
