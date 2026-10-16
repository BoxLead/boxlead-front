import { Link } from "react-router-dom";
import { ArrowRightIcon } from "../../components/icons/UiIcons";
import { AgentDemo } from "./AgentDemo";
import { RollText } from "./RollText";
import "./HeroSection.css";

const titleLines = ["Escalá tus ventas", "con un agente"];

export function HeroSection() {
  return (
    <section className="hero landing-section" data-glow>
      <div className="hero-backdrop" aria-hidden="true" />
      <div className="hero-spotlight" aria-hidden="true" />

      <div className="landing-container hero-content">
        <div className="hero-text">
          <span className="hero-badge">
            <span className="hero-badge-dot" />
            Agentes de IA para ventas
          </span>
          <h1 className="hero-title">
            {titleLines.map((line) => (
              <span className="hero-line" key={line}>
                <span>{line} </span>
              </span>
            ))}
            <span className="hero-line hero-title-accent">
              <span>que trabaja solo.</span>
            </span>
          </h1>
          <p className="hero-subtitle">
            BoxLead responde, califica y ordena cada lead de todos tus canales.
            En automático, las 24 horas.
          </p>
          <div className="hero-actions">
            <Link to="/register" className="landing-btn landing-btn-primary">
              <RollText>Empezar ahora</RollText>
              <ArrowRightIcon width={18} height={18} />
            </Link>
            <a href="#demo" className="landing-btn landing-btn-secondary">
              <RollText>Ver la demo</RollText>
            </a>
          </div>
        </div>

        <div className="hero-visual">
          <div className="hero-tilt">
            <AgentDemo />
          </div>
        </div>
      </div>

      <a href="#demo" className="hero-scroll">
        <span className="hero-scroll-line" aria-hidden="true" />
        Deslizá para ver más
      </a>
    </section>
  );
}
