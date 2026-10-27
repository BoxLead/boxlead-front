import { useEffect, useId, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { LogoMark } from "../../../src/components/Logo/Logo";
import { ChevronDownIcon, LogoutIcon } from "../../../src/components/icons/UiIcons";
import { Tag } from "../../../src/components/ui/Tag";
import { cx } from "../../../src/util/classNames";
import { formatTime } from "../format";
import { NAV } from "../nav";
import { canAccess, ROLE_LABELS } from "../session/roles";
import { useAdmin, useSession } from "../session/session";
import { ScreenBoundary } from "./ScreenBoundary";
import "./AdminLayout.css";

export function AdminLayout() {
  const me = useAdmin();
  const { signOut } = useSession();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const menuId = useId();
  const navRef = useRef<HTMLElement>(null);
  const sections = NAV.map((section) => ({
    ...section,
    items: section.items.filter((item) => canAccess(me.roles, item.access)),
  })).filter((section) => section.items.length > 0);

  useEffect(() => {
    if (!menuOpen) return;
    navRef.current?.querySelector<HTMLElement>("a")?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  async function leave() {
    setLeaving(true);
    await signOut();
  }

  return (
    <div className="admin-layout">
      <aside className={cx("admin-sidebar", menuOpen && "admin-sidebar-open")}>
        <div className="admin-bar">
          <span className="admin-brand">
            <LogoMark className="admin-brand-mark" />
            <span className="admin-brand-text">Backoffice</span>
          </span>
          <button
            type="button"
            className="btn btn-secondary btn-sm admin-menu-toggle"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            onClick={() => setMenuOpen((open) => !open)}
          >
            Menú
            <ChevronDownIcon width={16} height={16} />
          </button>
        </div>
        {menuOpen ? <button type="button" className="admin-scrim" aria-label="Cerrar el menú" onClick={() => setMenuOpen(false)} /> : null}
        <div className="admin-menu" id={menuId}>
          <nav className="admin-nav" aria-label="Secciones" ref={navRef}>
            {sections.map((section) => (
              <div key={section.label} className="admin-nav-section">
                <p className="admin-nav-heading">{section.label}</p>
                <ul className="admin-nav-list">
                  {section.items.map((item) => (
                    <li key={item.id}>
                      <NavLink
                        to={item.path}
                        end={item.path === "/"}
                        className={({ isActive }) => cx("admin-nav-link", isActive && "admin-nav-link-active")}
                        onClick={() => setMenuOpen(false)}
                      >
                        {item.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
          <div className="admin-account">
            <div className="admin-account-head">
              <p className="admin-account-email" title={me.email}>
                {me.email}
              </p>
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-icon admin-signout"
                aria-label={leaving ? "Saliendo…" : "Salir"}
                title="Salir"
                onClick={() => void leave()}
                disabled={leaving}
              >
                <LogoutIcon width={16} height={16} />
              </button>
            </div>
            <div className="admin-account-meta">
              {me.roles.map((role) => (
                <Tag key={role} tone="accent">
                  {ROLE_LABELS[role]}
                </Tag>
              ))}
              {me.adminSessionExpiresAt ? <span className="admin-account-session">Hasta las {formatTime(me.adminSessionExpiresAt)}</span> : null}
            </div>
          </div>
        </div>
      </aside>
      <main className="admin-main">
        <ScreenBoundary key={location.pathname}>
          <Outlet />
        </ScreenBoundary>
      </main>
    </div>
  );
}
