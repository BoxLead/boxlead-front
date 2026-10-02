import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  InstagramIcon,
  MercadoLibreIcon,
  WhatsAppIcon,
} from "../icons/PlatformIcons";
import { CheckIcon } from "../icons/UiIcons";
import { LogoMark } from "./Logo";
import "./AgentDemo.css";

type Scene = {
  channel: string;
  icon: ReactNode;
  contact: string;
  context: string;
  inbound: string;
  reply: string;
  outcomes: string[];
};

const scenes: Scene[] = [
  {
    channel: "WhatsApp",
    icon: <WhatsAppIcon width={18} height={18} />,
    contact: "Carla Méndez",
    context: "Mensaje directo",
    inbound:
      "Hola! Vi el aviso. ¿Tienen stock en negro y hacen envíos a Córdoba?",
    reply:
      "¡Hola Carla! Sí, tenemos stock en negro y enviamos a Córdoba en 48 hs. ¿Querés que te pase el link de pago?",
    outcomes: ["Lead calificado", "Pipeline actualizado"],
  },
  {
    channel: "Instagram",
    icon: <InstagramIcon width={18} height={18} />,
    contact: "@tomas.rios",
    context: "Comentario en una publicación",
    inbound: "¿Precio? ¿Tienen cuotas?",
    reply:
      "¡Hola Tomás! Te escribimos por privado con los precios y las cuotas disponibles.",
    outcomes: ["Comentario respondido", "Lead creado"],
  },
  {
    channel: "MercadoLibre",
    icon: <MercadoLibreIcon width={18} height={18} />,
    contact: "Comprador",
    context: "Pregunta en una publicación",
    inbound: "Buenas, ¿hacen factura A?",
    reply:
      "¡Hola! Sí, hacemos factura A. Podés cargar tus datos fiscales al momento de comprar.",
    outcomes: ["Pregunta respondida", "Lead creado"],
  },
];

/** Phases of a scene: lead writes → agent types → agent replies → outcome. */
const PHASE_DURATIONS = [1100, 1500, 1300, 3200];
const LAST_PHASE = PHASE_DURATIONS.length - 1;

type Step = { scene: number; phase: number };

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function AgentDemo() {
  const [autoplay] = useState(() => !prefersReducedMotion());
  const [step, setStep] = useState<Step>(() => ({
    scene: 0,
    phase: autoplay ? 0 : LAST_PHASE,
  }));

  useEffect(() => {
    if (!autoplay) return;
    const timer = window.setTimeout(() => {
      setStep((current) =>
        current.phase < LAST_PHASE
          ? { scene: current.scene, phase: current.phase + 1 }
          : { scene: (current.scene + 1) % scenes.length, phase: 0 },
      );
    }, PHASE_DURATIONS[step.phase]);
    return () => window.clearTimeout(timer);
  }, [autoplay, step]);

  const scene = scenes[step.scene];
  const status = ["Leyendo", "Escribiendo", "Respondido", "Respondido solo"][
    step.phase
  ];

  return (
    <div className="agent-demo" aria-label="Demostración del agente de BoxLead">
      <div className="agent-demo-tabs" role="tablist" aria-label="Canales">
        {scenes.map((item, index) => (
          <button
            type="button"
            role="tab"
            key={item.channel}
            aria-selected={index === step.scene}
            className={`agent-demo-tab${index === step.scene ? " is-active" : ""}`}
            onClick={() =>
              setStep({ scene: index, phase: autoplay ? 0 : LAST_PHASE })
            }
          >
            {item.icon}
            <span>{item.channel}</span>
          </button>
        ))}
      </div>

      <div className="agent-demo-thread" role="tabpanel" key={step.scene}>
        <div className="agent-demo-meta">
          <span className="agent-demo-contact">{scene.contact}</span>
          <span className="agent-demo-context">{scene.context}</span>
        </div>

        <p className="agent-demo-bubble agent-demo-bubble-in">
          {scene.inbound}
        </p>

        {step.phase === 1 && (
          <div
            className="agent-demo-bubble agent-demo-bubble-out agent-demo-typing"
            aria-hidden="true"
          >
            <span />
            <span />
            <span />
          </div>
        )}

        {step.phase >= 2 && (
          <p className="agent-demo-bubble agent-demo-bubble-out">
            {scene.reply}
          </p>
        )}

        {step.phase >= 3 && (
          <ul className="agent-demo-outcomes">
            {scene.outcomes.map((outcome) => (
              <li className="agent-demo-outcome" key={outcome}>
                <CheckIcon width={14} height={14} />
                {outcome}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="agent-demo-footer">
        <span className="agent-demo-agent">
          <span className="agent-demo-agent-avatar">
            <LogoMark />
          </span>
          Agente BoxLead
        </span>
        <span
          className={`agent-demo-status${step.phase >= 2 ? " is-done" : ""}`}
        >
          <span className="agent-demo-status-dot" />
          {status}
        </span>
      </div>
    </div>
  );
}
