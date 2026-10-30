import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
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

type NavId = "inbox" | "leads" | "metrics" | "categories" | "agents" | "connections";

type NavItem = {
  to: string;
  id: NavId;
  icon: ReactNode;
  data?: string;
};

const links: NavItem[] = [
  { to: "/app/inbox", id: "inbox", icon: <InboxIcon />, data: CONVERSATIONS_KEY },
  { to: "/app/leads", id: "leads", icon: <UsersIcon />, data: ALL_LEADS_KEY },
  { to: "/app/metrics", id: "metrics", icon: <ChartIcon />, data: CATEGORIES_KEY },
  { to: "/app/categories", id: "categories", icon: <TagIcon />, data: CATEGORIES_KEY },
  { to: "/app/agents", id: "agents", icon: <BotIcon />, data: AGENTS_KEY },
  { to: "/app/connections", id: "connections", icon: <PlugIcon />, data: CONNECTIONS_KEY },
];

function warmNavItem(item: NavItem): void {
  void preloadRoute(item.to);
  if (item.data) prefetchQuery(item.data);
}

export function Sidebar() {
  const { t } = useTranslation("shell");
  const collapsed = useSidebar() === "collapsed";
  const sidebarLabel = collapsed ? t("nav.expand") : t("nav.collapse");

  return (
    <aside className="sidebar" aria-label={t("nav.label")}>
      <Link to="/app/inbox" className="sidebar-brand" aria-label="BoxLead">
        <Logo />
      </Link>
      <nav className="sidebar-nav">
        {links.map((item) => {
          const label = t(`nav.${item.id}`);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              viewTransition
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `sidebar-link${isActive ? " sidebar-link-active" : ""}`
              }
              onPointerEnter={() => warmNavItem(item)}
              onFocus={() => warmNavItem(item)}
              onTouchStart={() => warmNavItem(item)}
            >
              {item.icon}
              <span className="sidebar-link-label">{label}</span>
            </NavLink>
          );
        })}
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
