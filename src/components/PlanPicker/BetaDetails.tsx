import type { InvitationCheck } from "../../data/plans";
import { SUPPORT_EMAIL } from "../../util/company";

export function BetaDetails({ invitation }: { invitation: InvitationCheck }) {
  if (invitation.status === "valid") {
    return (
      <span className="plan-option-note">
        Sin cargo por un tiempo limitado con tu invitación para {invitation.invitation.email}.
      </span>
    );
  }
  if (invitation.status === "error") {
    return (
      <span className="plan-option-note">
        No pudimos comprobar tu invitación. Recargá la página para probar de nuevo.
      </span>
    );
  }
  return (
    <span className="plan-option-note">
      Es solo por invitación. Si te invitamos, abrí el link del email que te mandamos. Para pedirla
      escribinos a <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
    </span>
  );
}
