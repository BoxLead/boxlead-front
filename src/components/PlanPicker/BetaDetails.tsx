import { useTranslation } from "react-i18next";
import type { InvitationCheck } from "../../data/plans";
import { SUPPORT_EMAIL } from "../../util/company";

export function BetaDetails({ invitation }: { invitation: InvitationCheck }) {
  const { t } = useTranslation("auth");
  if (invitation.status === "valid") {
    return (
      <span className="plan-option-note">
        {t("plans.betaValid", { email: invitation.invitation.email })}
      </span>
    );
  }
  if (invitation.status === "error") {
    return (
      <span className="plan-option-note">
        {t("plans.betaError")}
      </span>
    );
  }
  return (
    <span className="plan-option-note">
      {t("plans.betaNone")} <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
    </span>
  );
}
