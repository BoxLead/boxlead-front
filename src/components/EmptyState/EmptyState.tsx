import type { ReactNode } from "react";
import { EmptyIllustration, type Illustration } from "./EmptyIllustration";
import "./EmptyState.css";

type EmptyStateProps = {
  icon?: ReactNode;
  illustration?: Illustration;
  title: string;
  hint?: string;
  action?: ReactNode;
};

export function EmptyState({ icon, illustration, title, hint, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      {illustration ? (
        <EmptyIllustration kind={illustration} />
      ) : icon ? (
        <span className="empty-state-icon">{icon}</span>
      ) : null}
      <p className="empty-state-title">{title}</p>
      {hint ? <p className="empty-state-hint">{hint}</p> : null}
      {action ? <div className="empty-state-action">{action}</div> : null}
    </div>
  );
}
