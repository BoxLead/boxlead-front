import { useId, type Ref } from "react";
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

const ENTERPRISE_SUBJECT = encodeURIComponent("Plan Enterprise");

export function PlanPicker({ plans, invitation, value, onChange, error, ref }: PlanPickerProps) {
  const errorId = useId();

  if (!hasChoices(plans)) {
    return (
      <p className="plan-picker-empty" role="status">
        Por ahora no hay planes para elegir acá. Creá tu cuenta y elegí tu plan desde Facturación.
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
      <legend className="plan-picker-legend">Elegí tu plan</legend>
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
          tag="Por invitación"
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
            <span className="plan-option-tag">A medida</span>
          </span>
          <span className="plan-option-details">
            <span className="plan-option-note">
              Lo armamos con vos según lo que necesite tu equipo.{" "}
              <a href={`mailto:${SUPPORT_EMAIL}?subject=${ENTERPRISE_SUBJECT}`}>Hablá con nosotros</a>
            </span>
          </span>
        </div>
      ))}
    </fieldset>
  );
}
