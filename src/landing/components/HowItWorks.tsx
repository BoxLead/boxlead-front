import type { ReactNode } from "react";
import {
  InstagramIcon,
  MercadoLibreIcon,
  MessengerIcon,
  WhatsAppIcon,
} from "../icons/PlatformIcons";
import { BoltIcon, PlugIcon, SlidersIcon } from "../icons/UiIcons";
import "./HowItWorks.css";

type Step = {
  icon: ReactNode;
  title: string;
  description: string;
  visual: ReactNode;
};

const steps: Step[] = [
  {
    icon: <PlugIcon />,
    title: "Conectá tus canales",
    description: "En pocos clics, con el acceso oficial de cada plataforma.",
    visual: (
      <ul className="how-visual how-visual-channels" aria-label="Canales">
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
          <MercadoLibreIcon width={24} height={24} />
        </li>
      </ul>
    ),
  },
  {
    icon: <SlidersIcon />,
    title: "Configurá tu agente",
    description: "Contale qué vendés y cómo te gusta atender.",
    visual: (
      <ul className="how-visual how-visual-chips">
        <li>Productos</li>
        <li>Precios</li>
        <li>Preguntas frecuentes</li>
        <li>Tono</li>
      </ul>
    ),
  },
  {
    icon: <BoltIcon />,
    title: "Escalá en automático",
    description: "Atiende todas tus conversaciones a la vez, las 24 horas.",
    visual: (
      <ul className="how-visual how-visual-chips how-visual-done">
        <li>24/7</li>
        <li>En simultáneo</li>
        <li>Sin esperas</li>
      </ul>
    ),
  },
];

export function HowItWorks() {
  return (
    <section id="como-funciona" className="landing-section landing-section-alt">
      <div className="landing-container">
        <div className="landing-section-head" data-reveal>
          <span className="landing-section-label">Cómo funciona</span>
          <h2 className="landing-section-title">En automático en tres pasos</h2>
        </div>

        <ol className="how-steps">
          {steps.map((step, index) => (
            <li
              className="how-step landing-card"
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
