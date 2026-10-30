import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { trackEvent } from "../../analytics/gtag";
import { Logo } from "../../components/Logo/Logo";
import { stripLanguage } from "../../i18n/languages";
import { useLocalizedPath } from "../../i18n/useLanguage";
import { BILLING_ENABLED } from "../flags";
import { LanguageSwitch } from "./LanguageSwitch";
import { RollText } from "./RollText";
import "./Header.css";

const HIDE_AFTER = 480;
const SCROLL_TOLERANCE = 6;
type NavLink = { href: string; label: "demo" | "howItWorks" | "agent" | "plans" | "faq" };

const NAV_LINKS: NavLink[] = [
  { href: "#demo", label: "demo" },
  { href: "#como-funciona", label: "howItWorks" },
  { href: "#agente", label: "agent" },
  ...(BILLING_ENABLED ? [{ href: "#planes", label: "plans" } as const] : []),
  { href: "#faq", label: "faq" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [current, setCurrent] = useState<string | null>(null);
  const { t } = useTranslation("landing");
  const localized = useLocalizedPath();
  const onLanding = stripLanguage(useLocation().pathname) === "/";

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
      <div className="landing-header-inner">
        <Link to={localized("/")} className="header-logo" aria-label={t("header.home")}>
          <Logo />
        </Link>
        <nav className="header-nav" aria-label={t("header.nav")}>
          {NAV_LINKS.map((link) => (
            <a
              href={onLanding ? link.href : localized(`/${link.href}`)}
              className={`header-nav-link${current === link.href ? " is-current" : ""}`}
              aria-current={current === link.href ? "location" : undefined}
              key={link.href}
            >
              <RollText>{t(`header.links.${link.label}`)}</RollText>
            </a>
          ))}
        </nav>
        <div className="header-actions">
          <LanguageSwitch className="header-language" />
          <Link to={localized("/login")} className="header-signin">
            <RollText>{t("header.signIn")}</RollText>
          </Link>
          <Link
            to={localized("/register")}
            className="landing-btn landing-btn-primary landing-btn-sm"
            onClick={() => trackEvent("cta_registro", { ubicacion: "header" })}
          >
            <RollText>{t("header.start")}</RollText>
          </Link>
        </div>
      </div>
    </header>
  );
}
