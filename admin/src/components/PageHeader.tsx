import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import "./PageHeader.css";

export type Crumb = { to: string; label: string };

type PageHeaderProps = {
  title: string;
  description?: ReactNode;
  crumbs?: readonly Crumb[];
  actions?: ReactNode;
  meta?: ReactNode;
};

export function PageHeader({ title, description, crumbs, actions, meta }: PageHeaderProps) {
  return (
    <header className="admin-header">
      <div className="admin-header-main">
        {crumbs && crumbs.length > 0 ? (
          <nav className="admin-crumbs" aria-label="Ubicación">
            <ol>
              {crumbs.map((crumb) => (
                <li key={crumb.to}>
                  <Link to={crumb.to}>{crumb.label}</Link>
                </li>
              ))}
              <li aria-current="page">{title}</li>
            </ol>
          </nav>
        ) : null}
        <h1 className="admin-header-title">{title}</h1>
        {description ? <p className="admin-header-desc">{description}</p> : null}
      </div>
      {actions ? <div className="admin-header-actions">{actions}</div> : null}
      {meta ? <div className="admin-header-meta">{meta}</div> : null}
    </header>
  );
}
