import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Logo } from "./Logo";
import "./Header.css";

export function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 12);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className={`landing-header${scrolled ? " header-scrolled" : ""}`}>
      <div className="landing-header-inner">
        <Link to="/" className="header-logo" aria-label="BoxLead — inicio">
          <Logo />
        </Link>
        <nav className="header-nav" aria-label="Principal">
          <a href="#como-funciona" className="header-nav-link">
            Cómo funciona
          </a>
          <a href="#agente" className="header-nav-link">
            El agente
          </a>
          <a href="#faq" className="header-nav-link">
            Preguntas
          </a>
        </nav>
        <div className="header-actions">
          <Link to="/login" className="header-signin">
            Ingresar
          </Link>
          <Link
            to="/register"
            className="landing-btn landing-btn-primary landing-btn-sm"
          >
            Empezar
          </Link>
        </div>
      </div>
    </header>
  );
}
