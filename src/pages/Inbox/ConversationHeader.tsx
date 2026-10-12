import { Link } from "react-router-dom";
import { ArrowLeftIcon } from "../../components/icons/UiIcons";
import { Avatar } from "../../components/ui/Avatar";
import { Banner } from "../../components/ui/Banner";
import { Tag } from "../../components/ui/Tag";
import { getPlatform, hasStages, stageLabel } from "../../platforms";
import type { ConversationRow } from "./inboxModel";

type ConversationHeaderProps = {
  row: ConversationRow;
  backTo: string;
};

export function ConversationHeader({ row, backTo }: ConversationHeaderProps) {
  const platform = getPlatform(row.platform);
  return (
    <>
      <header className="conversation-header">
        <Link to={backTo} className="conversation-back" aria-label="Volver a la lista">
          <ArrowLeftIcon />
        </Link>
        <Avatar name={row.displayName} platform={row.platform} />
        <div className="conversation-header-text">
          <h2 className="conversation-header-name">{row.displayName}</h2>
          <p className="conversation-header-meta">
            <span>{platform.name}</span>
            {hasStages(row.platform) ? (
              <Tag tone={row.salesStage === "POST_SALE" ? "success" : "meli"}>{stageLabel(row.platform, row.salesStage)}</Tag>
            ) : null}
          </p>
        </div>
        <Link to={`/app/leads/${row.leadId}`} className="btn btn-secondary btn-sm conversation-lead-link">
          Ver lead
        </Link>
      </header>
      {row.needsAttention ? (
        <div className="conversation-handoff">
          <Banner tone="warning" title="Un agente pidió tu atención">
            {row.attentionReason ?? "Esta conversación necesita que la atienda una persona."}
          </Banner>
        </div>
      ) : null}
    </>
  );
}
