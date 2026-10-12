import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../../context/auth";
import { BotIcon, ChartIcon, InboxIcon, LogoutIcon, PlugIcon, TagIcon, UsersIcon } from "../icons/UiIcons";
import { Logo } from "../Logo/Logo";
import "./Sidebar.css";

type NavItem = {
  to: string;
  label: string;
  icon: ReactNode;
};

const links: NavItem[] = [
  { to: "/app/inbox", label: "Bandeja", icon: <InboxIcon /> },
  { to: "/app/leads", label: "Leads", icon: <UsersIcon /> },
  { to: "/app/metrics", label: "Métricas", icon: <ChartIcon /> },
  { to: "/app/categories", label: "Categorías", icon: <TagIcon /> },
  { to: "/app/agents", label: "Agentes", icon: <BotIcon /> },
  { to: "/app/connections", label: "Conexiones", icon: <PlugIcon /> },
];

export function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="sidebar" aria-label="Navegación principal">
      <Link to="/app/inbox" className="sidebar-brand" aria-label="BoxLead">
        <Logo />
      </Link>
      <nav className="sidebar-nav">
        {links.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `sidebar-link${isActive ? " sidebar-link-active" : ""}`
            }
          >
            {icon}
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-user" title={user?.email}>
          {user?.email}
        </div>
        <button type="button" className="sidebar-logout" onClick={logout}>
          <LogoutIcon />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
