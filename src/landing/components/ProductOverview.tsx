import type { ReactNode } from "react";
import {
  InstagramIcon,
  MercadoLibreMark,
  WhatsAppIcon,
} from "../../components/icons/PlatformIcons";
import {
  ArrowRightIcon,
  BoltIcon,
  CheckIcon,
  ClockIcon,
  InboxIcon,
  MessageIcon,
  TargetIcon,
  UsersIcon,
} from "../../components/icons/UiIcons";
import { LogoMark } from "../../components/Logo/Logo";
import "./ProductOverview.css";

type Lead = {
  icon: ReactNode;
  contact: string;
  inbound: string;
  waiting: string;
  reply: string;
  outcome: string;
};

type Point = {
  icon: ReactNode;
  title: string;
  description: string;
};

const leads: Lead[] = [
  {
    icon: <WhatsAppIcon width={20} height={20} />,
    contact: "Carla Méndez",
    inbound: "¿Hay stock en negro? ¿Envían a Córdoba?",
    waiting: "hace 3 h",
    reply: "¡Hola Carla! Sí, hay stock y enviamos a Córdoba.",
    outcome: "Calificado",
  },
  {
    icon: <InstagramIcon width={20} height={20} />,
    contact: "@tomas.rios",
    inbound: "¿Precio? ¿Tienen cuotas?",
    waiting: "anoche",
    reply: "¡Hola Tomás! Te pasamos precios y cuotas por privado.",
    outcome: "Lead creado",
  },
  {
    icon: <MercadoLibreMark width={22} height={22} />,
    contact: "Comprador",
    inbound: "Buenas, ¿hacen factura A?",
    waiting: "ayer",
    reply: "¡Hola! Sí, hacemos factura A.",
    outcome: "Respondida",
  },
];

const pains: Point[] = [
  {
    icon: <MessageIcon width={18} height={18} />,
    title: "Consultas repartidas",
    description: "Saltás entre WhatsApp, Instagram y MercadoLibre para no perder ninguna.",
  },
  {
    icon: <ClockIcon width={18} height={18} />,
    title: "Clientes que esperan",
    description: "De noche o en un día cargado nadie contesta, y el cliente le compra a otro.",
  },
  {
    icon: <UsersIcon width={18} height={18} />,
    title: "Crecer es contratar",
    description: "Si suben las consultas, necesitás sumar a otra persona para atenderlas.",
  },
];

const gains: Point[] = [
  {
    icon: <InboxIcon width={18} height={18} />,
    title: "Una sola bandeja",
    description: "Todos tus canales en un lugar, con cada lead ordenado y con su estado.",
  },
  {
    icon: <BoltIcon width={18} height={18} />,
    title: "Respuesta en segundos, las 24 horas",
    description: "Tus agentes contestan con la información de tu negocio, también de noche.",
  },
  {
    icon: <TargetIcon width={18} height={18} />,
    title: "Más ventas con el mismo equipo",
    description: "Tu equipo se ocupa de cerrar y de los casos que necesitan a una persona.",
  },
];

function PointList({ points }: { points: Point[] }) {
  return (
    <ul className="problem-points">
      {points.map((point) => (
        <li className="problem-point" key={point.title}>
          <span className="problem-point-icon">{point.icon}</span>
          <span>
            <span className="problem-point-title">{point.title}</span>
            <span className="problem-point-desc">{point.description}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function ProductOverview() {
  return (
    <section className="landing-section problem">
      <div className="landing-container">
        <div className="landing-section-head" data-reveal>
          <span className="landing-section-label">El problema</span>
          <h2 className="landing-section-title">
            Si cada respuesta depende de una persona, tu negocio no escala
          </h2>
          <p className="problem-lead">
            Las consultas llegan por todos lados y a cualquier hora. Estas son las
            mismas tres, atendidas a mano y con BoxLead.
          </p>
        </div>

        <div className="problem-compare">
          <article
            className="problem-panel problem-panel-before landing-glow"
            data-glow
            data-reveal
            data-reveal-from="left"
          >
            <header className="problem-panel-head">
              <span className="problem-panel-tag">Hoy, a mano</span>
              <span className="problem-panel-meta">{leads.length} sin responder</span>
            </header>

            <ul className="problem-notes" aria-label="Consultas sin responder">
              {leads.map((lead) => (
                <li className="problem-note" key={lead.contact}>
                  <span className="problem-channel">{lead.icon}</span>
                  <span className="problem-note-body">
                    <span className="problem-note-top">
                      <span className="problem-note-contact">{lead.contact}</span>
                      <span className="problem-note-time">{lead.waiting}</span>
                    </span>
                    <span className="problem-note-text">{lead.inbound}</span>
                  </span>
                  <span className="problem-note-state">Sin responder</span>
                </li>
              ))}
            </ul>

            <PointList points={pains} />
          </article>

          <span className="problem-bridge" aria-hidden="true">
            <ArrowRightIcon width={20} height={20} />
          </span>

          <article
            className="problem-panel problem-panel-after landing-glow"
            data-glow
            data-reveal="1"
            data-reveal-from="right"
          >
            <header className="problem-panel-head">
              <span className="problem-panel-tag">
                <LogoMark width={16} height={16} />
                Con BoxLead
              </span>
              <span className="problem-panel-meta problem-panel-meta-live">
                <span className="problem-live-dot" />
                Tus agentes trabajando
              </span>
            </header>

            <ul className="problem-inbox" aria-label="Consultas respondidas por tus agentes">
              {leads.map((lead) => (
                <li className="problem-row" key={lead.contact}>
                  <span className="problem-channel">{lead.icon}</span>
                  <span className="problem-row-body">
                    <span className="problem-row-contact">{lead.contact}</span>
                    <span className="problem-row-reply">
                      <CheckIcon width={13} height={13} />
                      <span>{lead.reply}</span>
                    </span>
                  </span>
                  <span className="problem-row-outcome">{lead.outcome}</span>
                </li>
              ))}
            </ul>

            <PointList points={gains} />
          </article>
        </div>
      </div>
    </section>
  );
}
