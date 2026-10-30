import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { trackEvent } from "../../analytics/gtag";
import { ArrowRightIcon } from "../../components/icons/UiIcons";
import { useLocalizedPath } from "../../i18n/useLanguage";
import { preloadRoute } from "../../routing/routePreload";
import { AgentDemo } from "./AgentDemo";
import { RollText } from "./RollText";
import "./HeroSection.css";

export function HeroSection() {
  const { t } = useTranslation("landing");
  const localized = useLocalizedPath();
  const register = localized("/register");
  return (
    <section className="hero landing-section" data-glow>
      <div className="hero-backdrop" aria-hidden="true" />
      <div className="hero-spotlight" aria-hidden="true" />

      <div className="landing-container hero-content">
        <div className="hero-text">
          <span className="hero-badge">
            <span className="hero-badge-dot" />
            {t("hero.badge")}
          </span>
          <h1 className="hero-title">
            {t("hero.titleLines", { returnObjects: true }).map((line) => (
              <span className="hero-line" key={line}>
                <span>{line} </span>
              </span>
            ))}
            <span className="hero-line hero-title-accent">
              <span>{t("hero.titleAccent")}</span>
            </span>
          </h1>
          <p className="hero-subtitle">{t("hero.subtitle")}</p>
          <div className="hero-actions">
            <Link
              to={register}
              className="landing-btn landing-btn-primary"
              onPointerEnter={() => void preloadRoute(register)}
              onFocus={() => void preloadRoute(register)}
              onTouchStart={() => void preloadRoute(register)}
              onClick={() => trackEvent("cta_registro", { ubicacion: "hero" })}
            >
              <RollText>{t("actions.start")}</RollText>
              <ArrowRightIcon width={18} height={18} />
            </Link>
            <a href="#demo" className="landing-btn landing-btn-secondary">
              <RollText>{t("actions.watchDemo")}</RollText>
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
        {t("hero.scroll")}
      </a>
    </section>
  );
}
