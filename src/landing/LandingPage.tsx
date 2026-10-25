import { useEffect } from "react";
import "./LandingPage.css";
import { Header } from "./components/Header";
import { HeroSection } from "./components/HeroSection";
import { IntegrationsMarquee } from "./components/IntegrationsMarquee";
import { DemoVideo } from "./components/DemoVideo";
import { ProductOverview } from "./components/ProductOverview";
import { KineticBand } from "./components/KineticBand";
import { HowItWorks } from "./components/HowItWorks";
import { AgentFlow } from "./components/AgentFlow";
import { PlansSection } from "./components/PlansSection";
import { FaqSection } from "./components/FaqSection";
import { CtaSection } from "./components/CtaSection";
import { Footer } from "./components/Footer";
import { BILLING_ENABLED } from "./flags";

function useScrollReveal() {
  useEffect(() => {
    const nodes = document.querySelectorAll(".landing [data-reveal]");
    if (!("IntersectionObserver" in window)) {
      nodes.forEach((node) => node.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.15 },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);
}

function usePointerGlow() {
  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    let latest: PointerEvent | null = null;

    function paint() {
      frame = 0;
      if (!latest) return;
      const target = latest.target instanceof Element ? latest.target.closest<HTMLElement>("[data-glow]") : null;
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const x = latest.clientX - rect.left;
      const y = latest.clientY - rect.top;
      target.style.setProperty("--glow-x", `${x}px`);
      target.style.setProperty("--glow-y", `${y}px`);
      target.style.setProperty("--glow-nx", (x / rect.width - 0.5).toFixed(3));
      target.style.setProperty("--glow-ny", (y / rect.height - 0.5).toFixed(3));
    }

    function handleMove(event: PointerEvent) {
      latest = event;
      if (!frame) frame = requestAnimationFrame(paint);
    }

    window.addEventListener("pointermove", handleMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", handleMove);
      cancelAnimationFrame(frame);
    };
  }, []);
}

export function LandingPage() {
  useScrollReveal();
  usePointerGlow();

  return (
    <div className="landing">
      <div className="landing-progress" aria-hidden="true" />
      <div className="landing-grain" aria-hidden="true" />
      <Header />
      <main>
        <HeroSection />
        <IntegrationsMarquee />
        <DemoVideo />
        <ProductOverview />
        <KineticBand />
        <HowItWorks />
        <AgentFlow />
        {BILLING_ENABLED && <PlansSection />}
        <FaqSection />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}
