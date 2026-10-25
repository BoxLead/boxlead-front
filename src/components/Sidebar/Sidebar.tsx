import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { AGENTS_KEY } from "../../data/agents";
import { CATEGORIES_KEY } from "../../data/categories";
import { CONVERSATIONS_KEY } from "../../data/conversations";
import { ALL_LEADS_KEY } from "../../data/leads";
import { prefetchQuery } from "../../data/queryCache";
import { CONNECTIONS_KEY } from "../../hooks/useConnectPlatform";
import { preloadRoute } from "../../routing/routePreload";
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
  data?: string;
};

const links: NavItem[] = [
  { to: "/app/inbox", label: "Bandeja", icon: <InboxIcon />, data: CONVERSATIONS_KEY },
  { to: "/app/leads", label: "Leads", icon: <UsersIcon />, data: ALL_LEADS_KEY },
  { to: "/app/metrics", label: "Métricas", icon: <ChartIcon />, data: CATEGORIES_KEY },
  { to: "/app/categories", label: "Categorías", icon: <TagIcon />, data: CATEGORIES_KEY },
  { to: "/app/agents", label: "Agentes", icon: <BotIcon />, data: AGENTS_KEY },
  { to: "/app/connections", label: "Conexiones", icon: <PlugIcon />, data: CONNECTIONS_KEY },
];

function warmNavItem(item: NavItem): void {
  void preloadRoute(item.to);
  if (item.data) prefetchQuery(item.data);
}

export function Sidebar() {
  const collapsed = useSidebar() === "collapsed";
  const sidebarLabel = collapsed ? "Expandir menú" : "Contraer menú";

  return (
    <aside className="sidebar" aria-label="Navegación principal">
      <Link to="/app/inbox" className="sidebar-brand" aria-label="BoxLead">
        <Logo />
      </Link>
      <nav className="sidebar-nav">
        {links.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            viewTransition
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              `sidebar-link${isActive ? " sidebar-link-active" : ""}`
            }
            onPointerEnter={() => warmNavItem(item)}
            onFocus={() => warmNavItem(item)}
            onTouchStart={() => warmNavItem(item)}
          >
            {item.icon}
            <span className="sidebar-link-label">{item.label}</span>
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
