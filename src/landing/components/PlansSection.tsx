import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowRightIcon, CheckIcon } from "../../components/icons/UiIcons";
import { useLocalizedPath } from "../../i18n/useLanguage";
import { cx } from "../../util/classNames";
import { RollText } from "./RollText";
import "./PlansSection.css";

type PlanSource = {
  key: "beta" | "starter" | "business";
  name: string;
  signupPath: string | null;
  featured?: boolean;
};

const PLANS: PlanSource[] = [
  { key: "beta", name: "Beta", signupPath: null },
  { key: "starter", name: "Starter", signupPath: "/register?plan=STARTER" },
  { key: "business", name: "Business", signupPath: "/register?plan=BUSINESS", featured: true },
];

export function PlansSection() {
  const { t } = useTranslation("landing");
  const localized = useLocalizedPath();
  const plans = PLANS.map((plan) => ({
    ...plan,
    tag: t(`plans.${plan.key}.tag`),
    description: t(`plans.${plan.key}.description`),
    features: t(`plans.${plan.key}.features`, { returnObjects: true }),
  }));
  return (
    <section id="planes" className="landing-section">
      <div className="landing-container">
        <div className="landing-section-head" data-reveal>
          <span className="landing-section-label">{t("plans.label")}</span>
          <h2 className="landing-section-title">{t("plans.title")}</h2>
          <p className="plans-lead">{t("plans.lead")}</p>
        </div>

        <ul className="plans-grid">
          {plans.map((plan, index) => (
            <li
              className={cx("plan-card landing-card landing-glow", plan.featured && "plan-card-featured")}
              data-glow
              data-reveal={index}
              key={plan.name}
            >
              <div className="plan-head">
                <h3 className="plan-name">{plan.name}</h3>
                <span className="plan-tag">{plan.tag}</span>
              </div>
              <p className="plan-description">{plan.description}</p>
              <ul className="plan-features">
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <CheckIcon width={16} height={16} />
                    {feature}
                  </li>
                ))}
              </ul>
              {plan.signupPath ? (
                <Link
                  to={localized(plan.signupPath)}
                  className={cx(
                    "plan-cta landing-btn",
                    plan.featured ? "landing-btn-primary" : "landing-btn-secondary",
                  )}
                >
                  <RollText>{t("plans.choose", { plan: plan.name })}</RollText>
                  <ArrowRightIcon width={18} height={18} />
                </Link>
              ) : (
                <p className="plan-cta plan-note">{t("plans.invitationNote")}</p>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
