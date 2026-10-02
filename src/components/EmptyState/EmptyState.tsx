import type { ReactNode } from "react";
import "./EmptyState.css";

type EmptyStateProps = {
  icon: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
};

export function EmptyState({ icon, title, hint, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon">{icon}</span>
      <p className="empty-state-title">{title}</p>
      {hint ? <p className="empty-state-hint">{hint}</p> : null}
      {action}
    </div>
  );
}
