import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Logo } from "../../components/Logo/Logo";
import { RollText } from "./RollText";
import "./Header.css";

const HIDE_AFTER = 480;
const SCROLL_TOLERANCE = 6;
const NAV_LINKS = [
  { href: "#demo", label: "Demo" },
  { href: "#como-funciona", label: "Cómo funciona" },
  { href: "#agente", label: "El agente" },
  { href: "#faq", label: "Preguntas" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);

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
      <div className="landing-header-inner">
        <Link to="/" className="header-logo" aria-label="BoxLead — inicio">
          <Logo />
        </Link>
        <nav className="header-nav" aria-label="Principal">
          {NAV_LINKS.map((link) => (
            <a href={link.href} className="header-nav-link" key={link.href}>
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
