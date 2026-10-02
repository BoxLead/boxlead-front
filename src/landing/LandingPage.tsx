import { useEffect } from "react";
import "./LandingPage.css";
import { Header } from "./components/Header";
import { HeroSection } from "./components/HeroSection";
import { IntegrationsMarquee } from "./components/IntegrationsMarquee";
import { ProductOverview } from "./components/ProductOverview";
import { HowItWorks } from "./components/HowItWorks";
import { AgentFlow } from "./components/AgentFlow";
import { FaqSection } from "./components/FaqSection";
import { CtaSection } from "./components/CtaSection";
import { Footer } from "./components/Footer";

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

export function LandingPage() {
  useScrollReveal();

  return (
    <div className="landing">
      <div className="landing-progress" aria-hidden="true" />
      <Header />
      <main>
        <HeroSection />
        <IntegrationsMarquee />
        <ProductOverview />
        <HowItWorks />
        <AgentFlow />
        <FaqSection />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}
