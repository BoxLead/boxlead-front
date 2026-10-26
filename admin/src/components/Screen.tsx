import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeftIcon } from "../../../src/components/icons/UiIcons";
import { useTitle } from "./useTitle";
import "./Screen.css";

type ScreenProps = {
  title: string;
  description?: string;
  back?: { to: string; label: string };
  actions?: ReactNode;
  children: ReactNode;
};

export function Screen({ title, description, back, actions, children }: ScreenProps) {
  useTitle(title);
  return (
    <div className="page screen">
      {back ? (
        <Link className="screen-back" to={back.to}>
          <ArrowLeftIcon width={16} height={16} />
          {back.label}
        </Link>
      ) : null}
      <header className="page-header">
        <div>
          <h1 className="page-title">{title}</h1>
          {description ? <p className="page-header-desc">{description}</p> : null}
        </div>
        {actions ? <div className="screen-actions">{actions}</div> : null}
      </header>
      {children}
    </div>
  );
}
