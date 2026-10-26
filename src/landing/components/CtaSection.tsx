import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { trackEvent } from "../../analytics/gtag";
import { SUPPORT_EMAIL } from "../../util/company";
import {
  InstagramIcon,
  MercadoLibreMark,
  MessengerIcon,
  WhatsAppIcon,
} from "../../components/icons/PlatformIcons";
import { ArrowRightIcon, CheckIcon } from "../../components/icons/UiIcons";
import { RollText } from "./RollText";
import "./CtaSection.css";

type Activity = {
  icon: ReactNode;
  title: string;
  result: string;
};

const ICON_SIZE = 20;

const activity: Activity[] = [
  {
    icon: <WhatsAppIcon width={ICON_SIZE} height={ICON_SIZE} />,
    title: "Consulta de stock",
    result: "Respondido",
  },
  {
    icon: <InstagramIcon width={ICON_SIZE} height={ICON_SIZE} />,
    title: "Comentario en una publicación",
    result: "Respondido",
  },
  {
    icon: <MercadoLibreMark width={ICON_SIZE} height={ICON_SIZE} />,
    title: "Pregunta sobre facturación",
    result: "Respondido",
  },
  {
    icon: <MessengerIcon width={ICON_SIZE} height={ICON_SIZE} />,
    title: "Pedido de precios",
    result: "Lead calificado",
  },
  {
    icon: <WhatsAppIcon width={ICON_SIZE} height={ICON_SIZE} />,
    title: "Consulta por envíos",
    result: "Lead calificado",
  },
];

function ActivityGroup({ hidden = false }: { hidden?: boolean }) {
  return (
    <ul className="cta-feed-group" aria-hidden={hidden || undefined}>
      {activity.map((item) => (
        <li className="cta-feed-item" key={item.title}>
          <span className="cta-feed-icon">{item.icon}</span>
          <span className="cta-feed-body">
            <span className="cta-feed-title">{item.title}</span>
            <span className="cta-feed-result">
              <CheckIcon width={14} height={14} />
              {item.result}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function CtaSection() {
  return (
    <section className="landing-section">
      <div className="landing-container">
        <div className="cta-card landing-glow" data-glow>
          <div>
            <h2 className="cta-title">Poné tus ventas en automático</h2>
            <p className="cta-subtitle">
              Tu próximo cliente ya te está escribiendo. Que le responda tu
              agente.
            </p>
            <div className="cta-actions">
              <Link
                to="/register"
                className="landing-btn landing-btn-primary landing-btn-lg"
                onClick={() => trackEvent("cta_registro", { ubicacion: "cierre" })}
              >
                <RollText>Empezar ahora</RollText>
                <ArrowRightIcon width={18} height={18} />
              </Link>
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="landing-btn landing-btn-secondary landing-btn-lg"
                onClick={() => trackEvent("contacto", { ubicacion: "cierre" })}
              >
                <RollText>Hablar con nosotros</RollText>
              </a>
            </div>
            <p className="cta-note">
              Una suscripción mensual · Todos tus canales
            </p>
          </div>

          <div className="cta-feed">
            <div className="cta-feed-head">
              <span>Tu agente</span>
              <span className="cta-feed-live">
                <span className="cta-feed-live-dot" />
                En automático
              </span>
            </div>
            <div className="cta-feed-viewport">
              <div className="cta-feed-track">
                <ActivityGroup />
                <ActivityGroup hidden />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
