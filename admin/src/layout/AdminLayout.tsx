import { useId, useState } from "react";
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
  const sections = NAV.map((section) => ({
    ...section,
    items: section.items.filter((item) => canAccess(me.roles, item.access)),
  })).filter((section) => section.items.length > 0);

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
        <div className="admin-menu" id={menuId}>
          <nav className="admin-nav" aria-label="Secciones">
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
            <p className="admin-account-email">{me.email}</p>
            <div className="admin-account-roles">
              {me.roles.map((role) => (
                <Tag key={role} tone="accent">
                  {ROLE_LABELS[role]}
                </Tag>
              ))}
            </div>
            {me.adminSessionExpiresAt ? (
              <p className="admin-account-session">Sesión abierta hasta las {formatTime(me.adminSessionExpiresAt)}</p>
            ) : null}
            <button type="button" className="btn btn-ghost btn-sm admin-signout" onClick={() => void leave()} disabled={leaving}>
              <LogoutIcon width={16} height={16} />
              {leaving ? "Saliendo…" : "Salir"}
            </button>
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
