import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { LeadResponse, PlatformType } from "../../api/types";
import { ArrowLeftIcon } from "../../components/icons/UiIcons";
import { PlatformBadge } from "../../components/PlatformBadge/PlatformBadge";
import { leadDisplayName } from "../../util/labels";
import "./ThreadPane.css";

type ThreadPaneProps = {
  lead: LeadResponse | undefined;
  platform: PlatformType;
  onBack: () => void;
  children: ReactNode;
  footer?: ReactNode;
};

export function ThreadPane({
  lead,
  platform,
  onBack,
  children,
  footer,
}: ThreadPaneProps) {
  return (
    <div className="thread-pane">
      <header className="thread-pane-header">
        <button
          type="button"
          className="thread-pane-back"
          aria-label="Volver a la lista"
          onClick={onBack}
        >
          <ArrowLeftIcon />
        </button>
        <div className="thread-pane-heading">
          <h2 className="thread-pane-title">{leadDisplayName(lead)}</h2>
          <PlatformBadge platform={platform} />
        </div>
        {lead ? (
          <Link
            to={`/app/leads/${lead.id}`}
            className="btn btn-secondary btn-sm"
          >
            Ver lead
          </Link>
        ) : null}
      </header>
      {children}
      {footer}
    </div>
  );
}
