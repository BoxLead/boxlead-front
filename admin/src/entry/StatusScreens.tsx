import { useSession } from "../session/session";
import { EntryLayout } from "./EntryLayout";

function SignOutButton() {
  const { signOut } = useSession();
  return (
    <button type="button" className="auth-submit" onClick={() => void signOut()}>
      Salir
    </button>
  );
}

export function NoAccessScreen({ email }: { email: string }) {
  return (
    <EntryLayout
      title="Esta cuenta no tiene acceso"
      subtitle={email ? `Entraste como ${email}, que no tiene un rol en el backoffice.` : "La cuenta con la que entraste no tiene un rol en el backoffice."}
    >
      <p className="auth-hint">Si tendrías que tenerlo, pedíselo a un dueño del equipo.</p>
      <SignOutButton />
    </EntryLayout>
  );
}

export function EnrollmentClosedScreen() {
  return (
    <EntryLayout
      title="Venció el plazo para configurar el factor"
      subtitle="Tenías 24 horas desde que te dieron el rol para configurar tu app de autenticación."
    >
      <p className="auth-hint">Pedile a un dueño del equipo que te vuelva a otorgar el rol y vas a tener 24 horas más.</p>
      <SignOutButton />
    </EntryLayout>
  );
}

export function FailedScreen() {
  const { retry } = useSession();
  return (
    <EntryLayout title="No pudimos conectar con BoxLead" subtitle="Revisá tu conexión y probá de nuevo.">
      <button type="button" className="auth-submit" onClick={() => void retry()}>
        Reintentar
      </button>
    </EntryLayout>
  );
}
