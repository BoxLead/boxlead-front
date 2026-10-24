import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { setSidebar, useSidebar } from "../../theme/theme";
import {
  BotIcon,
  ChartIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  InboxIcon,
  PlugIcon,
  TagIcon,
  UsersIcon,
} from "../icons/UiIcons";
import { Logo } from "../Logo/Logo";
import { UserMenu } from "./UserMenu";
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
  const collapsed = useSidebar() === "collapsed";
  const sidebarLabel = collapsed ? "Expandir menú" : "Contraer menú";

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
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              `sidebar-link${isActive ? " sidebar-link-active" : ""}`
            }
          >
            {icon}
            <span className="sidebar-link-label">{label}</span>
          </NavLink>
        ))}
      </nav>
      <button
        type="button"
        className="sidebar-toggle"
        aria-label={sidebarLabel}
        title={sidebarLabel}
        onClick={() => setSidebar(collapsed ? "expanded" : "collapsed")}
      >
        {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
      </button>
      <div className="sidebar-footer">
        <UserMenu />
      </div>
    </aside>
  );
}
