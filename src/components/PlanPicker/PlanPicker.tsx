import { useId, type Ref } from "react";
import { useTranslation } from "react-i18next";
import { hasChoices, type InvitationCheck, type SignupChoice, type SignupPlans } from "../../data/plans";
import { SUPPORT_EMAIL } from "../../util/company";
import { BetaDetails } from "./BetaDetails";
import { PaidPlanDetails } from "./PaidPlanDetails";
import { PlanOption } from "./PlanOption";
import "./PlanPicker.css";

type PlanPickerProps = {
  plans: SignupPlans;
  invitation: InvitationCheck;
  value: SignupChoice | null;
  onChange: (value: SignupChoice) => void;
  error?: string | null;
  ref?: Ref<HTMLFieldSetElement>;
};

export function PlanPicker({ plans, invitation, value, onChange, error, ref }: PlanPickerProps) {
  const { t } = useTranslation("auth");
  const errorId = useId();

  if (!hasChoices(plans)) {
    return (
      <p className="plan-picker-empty" role="status">
        {t("plans.empty")}
      </p>
    );
  }

  return (
    <fieldset
      ref={ref}
      className="plan-picker"
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? errorId : undefined}
    >
      <legend className="plan-picker-legend">{t("plans.legend")}</legend>
      {error ? (
        <p className="form-error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
      {plans.paid.map((plan) => (
        <PlanOption
          key={plan.code}
          name={plan.name}
          value={plan.code}
          checked={value === plan.code}
          onSelect={() => onChange(plan.code)}
        >
          <PaidPlanDetails plan={plan} />
        </PlanOption>
      ))}
      {plans.beta ? (
        <PlanOption
          name={plans.beta.name}
          tag={t("plans.inviteOnly")}
          value="DEMO"
          checked={value === "DEMO"}
          disabled={invitation.status !== "valid"}
          onSelect={() => onChange("DEMO")}
        >
          <BetaDetails invitation={invitation} />
        </PlanOption>
      ) : null}
      {plans.contact.map((plan) => (
        <div className="plan-option plan-option-contact" key={plan.code}>
          <span className="plan-option-head">
            <span className="plan-option-name">{plan.name}</span>
            <span className="plan-option-tag">{t("plans.custom")}</span>
          </span>
          <span className="plan-option-details">
            <span className="plan-option-note">
              {t("plans.customNote")}{" "}
              <a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(t("plans.enterpriseSubject"))}`}>{t("plans.talkToUs")}</a>
            </span>
          </span>
        </div>
      ))}
    </fieldset>
  );
}
