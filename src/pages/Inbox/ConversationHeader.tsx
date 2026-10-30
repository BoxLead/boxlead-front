import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowLeftIcon, TrashIcon, UserIcon } from "../../components/icons/UiIcons";
import { Avatar } from "../../components/ui/Avatar";
import { Banner } from "../../components/ui/Banner";
import { Tag } from "../../components/ui/Tag";
import { getPlatform, hasStages, stageLabel } from "../../platforms";
import type { ConversationRow } from "./inboxModel";

type ConversationHeaderProps = {
  row: ConversationRow;
  backTo: string;
  onDelete: () => void;
};

export function ConversationHeader({ row, backTo, onDelete }: ConversationHeaderProps) {
  const { t } = useTranslation("inbox");
  const platform = getPlatform(row.platform);
  return (
    <>
      <header className="conversation-header">
        <Link to={backTo} className="conversation-back" aria-label={t("header.back")}>
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
        <div className="conversation-header-actions">
          <button
            type="button"
            className="btn btn-danger btn-sm conversation-action"
            onClick={onDelete}
            aria-label={t("header.deleteLabel", { name: row.displayName })}
          >
            <TrashIcon width={16} height={16} />
            <span className="conversation-action-label">{t("actions.delete")}</span>
          </button>
          <Link
            to={`/app/leads/${row.leadId}`}
            className="btn btn-secondary btn-sm conversation-action conversation-lead-link"
            aria-label={t("header.leadLabel", { name: row.displayName })}
          >
            <UserIcon width={16} height={16} />
            <span className="conversation-action-label">{t("header.lead")}</span>
          </Link>
        </div>
      </header>
      {row.needsAttention ? (
        <div className="conversation-handoff">
          <Banner tone="warning" title={t("header.attentionTitle")}>
            {row.attentionReason ?? t("header.attentionText")}
          </Banner>
        </div>
      ) : null}
    </>
  );
}
