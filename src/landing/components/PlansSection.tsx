import { Link } from "react-router-dom";
import { ArrowRightIcon, CheckIcon } from "../../components/icons/UiIcons";
import { cx } from "../../util/classNames";
import { RollText } from "./RollText";
import "./PlansSection.css";

type Plan = {
  name: string;
  tag: string;
  description: string;
  features: string[];
  signupPath: string | null;
  featured?: boolean;
};

const plans: Plan[] = [
  {
    name: "Beta",
    tag: "Por invitación",
    description: "Para los negocios que invitamos a probar BoxLead.",
    features: [
      "Todos tus canales",
      "Agentes que responden o te dejan borradores",
      "Inbox, leads y métricas",
      "Por un tiempo limitado",
    ],
    signupPath: null,
  },
  {
    name: "Starter",
    tag: "Suscripción mensual",
    description: "Para poner en automático las consultas de tu negocio.",
    features: [
      "Todos tus canales",
      "Agentes que responden o te dejan borradores",
      "Inbox unificado, leads y categorías",
      "Métricas de tu atención",
    ],
    signupPath: "/register?plan=STARTER",
  },
  {
    name: "Business",
    tag: "Suscripción mensual",
    description: "Para negocios que reciben muchas consultas todos los días.",
    features: [
      "Todo lo de Starter",
      "Más agentes",
      "Más respuestas de tus agentes por mes",
      "Más historial de métricas",
    ],
    signupPath: "/register?plan=BUSINESS",
    featured: true,
  },
];

export function PlansSection() {
  return (
    <section id="planes" className="landing-section">
      <div className="landing-container">
        <div className="landing-section-head" data-reveal>
          <span className="landing-section-label">Planes</span>
          <h2 className="landing-section-title">Elegí cómo empezar</h2>
          <p className="plans-lead">
            Todos los planes conectan todos tus canales. Ves el precio al crear
            tu cuenta, antes de pagar.
          </p>
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
                  to={plan.signupPath}
                  className={cx(
                    "plan-cta landing-btn",
                    plan.featured ? "landing-btn-primary" : "landing-btn-secondary",
                  )}
                >
                  <RollText>{`Elegir ${plan.name}`}</RollText>
                  <ArrowRightIcon width={18} height={18} />
                </Link>
              ) : (
                <p className="plan-cta plan-note">Se activa con el link de tu invitación</p>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
