import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Logo } from "../../components/Logo/Logo";
import { CONSUMER_PAGES } from "../../util/consumerPages";
import { BILLING_ENABLED } from "../flags";
import { RollText } from "./RollText";
import "./Header.css";

const HIDE_AFTER = 480;
const SCROLL_TOLERANCE = 6;
const NAV_LINKS = [
  { href: "#demo", label: "Demo" },
  { href: "#como-funciona", label: "Cómo funciona" },
  { href: "#agente", label: "El agente" },
  ...(BILLING_ENABLED ? [{ href: "#planes", label: "Planes" }] : []),
  { href: "#faq", label: "Preguntas" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [current, setCurrent] = useState<string | null>(null);

  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const sections = NAV_LINKS.map((link) => document.querySelector(link.href)).filter(
      (section): section is Element => section !== null,
    );
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(`#${entry.target.id}`);
          else visible.delete(`#${entry.target.id}`);
        }
        setCurrent(NAV_LINKS.find((link) => visible.has(link.href))?.href ?? null);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let last = window.scrollY;
    function handleScroll() {
      const current = window.scrollY;
      setScrolled(current > 12);
      if (Math.abs(current - last) < SCROLL_TOLERANCE) return;
      setHidden(current > HIDE_AFTER && current > last);
      last = current;
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`landing-header${scrolled ? " header-scrolled" : ""}${hidden ? " header-hidden" : ""}`}
      onFocus={() => setHidden(false)}
    >
      <nav className="header-consumer" aria-label="Defensa del consumidor">
        {CONSUMER_PAGES.map((page) => (
          <Link to={page.to} className="header-consumer-link" key={page.to}>
            {page.label}
          </Link>
        ))}
      </nav>
      <div className="landing-header-inner">
        <Link to="/" className="header-logo" aria-label="BoxLead — inicio">
          <Logo />
        </Link>
        <nav className="header-nav" aria-label="Principal">
          {NAV_LINKS.map((link) => (
            <a
              href={link.href}
              className={`header-nav-link${current === link.href ? " is-current" : ""}`}
              aria-current={current === link.href ? "location" : undefined}
              key={link.href}
            >
              <RollText>{link.label}</RollText>
            </a>
          ))}
        </nav>
        <div className="header-actions">
          <Link to="/login" className="header-signin">
            <RollText>Ingresar</RollText>
          </Link>
          <Link
            to="/register"
            className="landing-btn landing-btn-primary landing-btn-sm"
          >
            <RollText>Empezar</RollText>
          </Link>
        </div>
      </div>
    </header>
  );
}
