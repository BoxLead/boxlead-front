import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  InstagramIcon,
  MercadoLibreMark,
  MessengerIcon,
  WhatsAppIcon,
} from "../../components/icons/PlatformIcons";
import {
  BoltIcon,
  PlugIcon,
  SlidersIcon,
} from "../../components/icons/UiIcons";
import "./HowItWorks.css";

type Step = {
  icon: ReactNode;
  visual: ReactNode;
};

function useSteps(): Step[] {
  const { t } = useTranslation("landing");
  return [
  {
    icon: <PlugIcon />,
    visual: (
      <ul className="how-visual how-visual-channels" aria-label={t("howItWorks.channels")}>
        <li title="WhatsApp">
          <WhatsAppIcon width={24} height={24} />
        </li>
        <li title="Instagram">
          <InstagramIcon width={24} height={24} />
        </li>
        <li title="Messenger">
          <MessengerIcon width={24} height={24} />
        </li>
        <li title="MercadoLibre">
          <MercadoLibreMark width={24} height={24} />
        </li>
      </ul>
    ),
  },
  {
    icon: <SlidersIcon />,
    visual: (
      <ul className="how-visual how-visual-chips">
        {t("howItWorks.setup", { returnObjects: true }).map((chip) => (
          <li key={chip}>{chip}</li>
        ))}
      </ul>
    ),
  },
  {
    icon: <BoltIcon />,
    visual: (
      <ul className="how-visual how-visual-chips how-visual-done">
        {t("howItWorks.scale", { returnObjects: true }).map((chip) => (
          <li key={chip}>{chip}</li>
        ))}
      </ul>
    ),
  },
  ];
}

export function HowItWorks() {
  const { t } = useTranslation("landing");
  const visuals = useSteps();
  const steps = t("howItWorks.steps", { returnObjects: true }).map((step, index) => ({ ...step, ...visuals[index] }));
  return (
    <section id="como-funciona" className="landing-section landing-section-alt">
      <div className="landing-container">
        <div className="landing-section-head" data-reveal>
          <span className="landing-section-label">{t("howItWorks.label")}</span>
          <h2 className="landing-section-title">{t("howItWorks.title")}</h2>
        </div>

        <ol className="how-steps">
          {steps.map((step, index) => (
            <li
              className="how-step landing-card landing-glow"
              data-glow
              key={step.title}
              data-reveal={index}
            >
              <div className="how-step-top">
                <span className="landing-icon-tile">{step.icon}</span>
                <span className="how-step-number">0{index + 1}</span>
              </div>
              <h3 className="how-step-title">{step.title}</h3>
              <p className="how-step-desc">{step.description}</p>
              {step.visual}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
