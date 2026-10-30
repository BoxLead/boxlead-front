import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { trackEvent } from "../../analytics/gtag";
import { ArrowRightIcon, CheckIcon } from "../../components/icons/UiIcons";
import { getPlatform } from "../../platforms";
import { preloadRoute } from "../../routing/routePreload";
import { CtaSection } from "../components/CtaSection";
import { FaqSection } from "../components/FaqSection";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { RollText } from "../components/RollText";
import { EDITORIAL_PAGES, editorialPage, type EditorialPageData } from "../editorial";
import { useScrollReveal } from "../useScrollReveal";
import "../LandingPage.css";
import "./EditorialPage.css";

const LOGO_SIZE = 56;

function Related({ page }: { page: EditorialPageData }) {
  const related = page.related.map((slug) => EDITORIAL_PAGES.find((candidate) => candidate.slug === slug)).filter(
    (candidate): candidate is EditorialPageData => candidate !== undefined,
  );
  return (
    <section className="landing-section editorial-related" aria-labelledby="editorial-related-heading">
      <div className="landing-container">
        <h2 className="editorial-related-heading" id="editorial-related-heading">
          También con tus otros canales
        </h2>
        <ul className="editorial-related-list">
          {related.map((item) => (
            <li key={item.slug}>
              <Link to={item.path} className="editorial-related-link landing-card">
                {item.platform ? <span className="editorial-related-logo">{getPlatform(item.platform).logo(28)}</span> : null}
                <span className="editorial-related-body">
                  <span className="editorial-related-title">{item.label}</span>
                  <span className="editorial-related-desc">{item.heading}</span>
                </span>
                <ArrowRightIcon width={18} height={18} aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function EditorialPage() {
  const { pathname } = useLocation();
  const page = editorialPage(pathname.replace(/\/+$/, "")) ?? EDITORIAL_PAGES[0];
  const platform = page.platform ? getPlatform(page.platform) : null;

  useEffect(() => {
    trackEvent("canal_visita", { canal: page.slug });
  }, [page.slug]);
  useScrollReveal(page.slug);

  return (
    <div className="landing editorial">
      <div className="landing-grain" aria-hidden="true" />
      <Header />
      <main>
        <section className="landing-section editorial-hero">
          <div className="hero-backdrop" aria-hidden="true" />
          <div className="landing-container editorial-hero-inner">
            <nav className="editorial-crumbs" aria-label="Ubicación">
              <Link to="/">Inicio</Link>
              <span aria-hidden="true">/</span>
              <span aria-current="page">{page.label}</span>
            </nav>
            <div className="editorial-hero-body">
              {platform ? <span className="editorial-hero-logo">{platform.logo(LOGO_SIZE)}</span> : null}
              <div className="editorial-hero-text">
                <span className="hero-badge">
                  <span className="hero-badge-dot" />
                  {page.label}
                </span>
                <h1 className="editorial-title">{page.heading}</h1>
                <p className="editorial-lead">{page.lead}</p>
                <div className="hero-actions">
                  <Link
                    to="/register"
                    className="landing-btn landing-btn-primary"
                    onPointerEnter={() => void preloadRoute("/register")}
                    onFocus={() => void preloadRoute("/register")}
                    onClick={() => trackEvent("cta_registro", { ubicacion: page.slug })}
                  >
                    <RollText>Empezar ahora</RollText>
                    <ArrowRightIcon width={18} height={18} />
                  </Link>
                  <Link to="/#demo" className="landing-btn landing-btn-secondary">
                    <RollText>Ver la demo</RollText>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-section landing-section-alt editorial-body" aria-labelledby="editorial-capabilities-heading">
          <div className="landing-container">
            <div className="landing-section-head" data-reveal>
              <span className="landing-section-label">Qué hace</span>
              <h2 className="landing-section-title" id="editorial-capabilities-heading">
                {page.capabilitiesHeading}
              </h2>
            </div>
            <ul className="editorial-grid">
              {page.capabilities.map((capability, index) => (
                <li className="editorial-card landing-card" data-reveal={index} key={capability.title}>
                  <span className="landing-icon-tile">
                    <CheckIcon width={20} height={20} aria-hidden="true" />
                  </span>
                  <h3 className="editorial-card-title">{capability.title}</h3>
                  <p className="editorial-card-desc">{capability.description}</p>
                </li>
              ))}
            </ul>
            <div className="editorial-connect" data-reveal>
              <h2 className="editorial-connect-heading" id="editorial-steps-heading">
                {page.stepsHeading}
              </h2>
              <ol className="editorial-steps" aria-labelledby="editorial-steps-heading">
                {page.steps.map((step, index) => (
                  <li className="editorial-step" key={step.title}>
                    <span className="editorial-step-number" aria-hidden="true">
                      0{index + 1}
                    </span>
                    <div>
                      <h3 className="editorial-step-title">{step.title}</h3>
                      <p className="editorial-step-desc">{step.description}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <FaqSection faqs={page.faqs} />
        <Related page={page} />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}
