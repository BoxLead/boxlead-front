import { Link } from "react-router-dom";
import { ArrowRightIcon } from "../../components/icons/UiIcons";
import { AgentDemo } from "./AgentDemo";
import "./HeroSection.css";

export function HeroSection() {
  return (
    <section className="hero landing-section">
      <div className="hero-backdrop" aria-hidden="true" />

      <div className="landing-container hero-content">
        <div className="hero-text">
          <span className="hero-badge">
            <span className="hero-badge-dot" />
            Agentes de IA para ventas
          </span>
          <h1 className="hero-title">
            Escalá tus ventas con un agente{" "}
            <span className="hero-title-accent">que trabaja solo.</span>
          </h1>
          <p className="hero-subtitle">
            BoxLead responde, califica y ordena cada lead de todos tus canales.
            En automático, las 24 horas.
          </p>
          <div className="hero-actions">
            <Link to="/register" className="landing-btn landing-btn-primary">
              Empezar ahora
              <ArrowRightIcon width={18} height={18} />
            </Link>
            <a
              href="#como-funciona"
              className="landing-btn landing-btn-secondary"
            >
              Ver cómo funciona
            </a>
          </div>
        </div>

        <div className="hero-visual">
          <AgentDemo />
        </div>
      </div>
    </section>
  );
}
