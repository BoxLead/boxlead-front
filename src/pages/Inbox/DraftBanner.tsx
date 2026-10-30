import { useTranslation } from "react-i18next";
import type { ReplyDraft } from "../../api/types";

type DraftBannerProps = {
  draft: ReplyDraft;
  tooLong: boolean;
  busy: boolean;
  onSend: () => void;
  onEdit: () => void;
  onDiscard: () => void;
};

export function DraftBanner({ draft, tooLong, busy, onSend, onEdit, onDiscard }: DraftBannerProps) {
  const { t } = useTranslation("inbox");
  const title = draft.agentName ? t("draft.byAgent", { name: draft.agentName }) : t("draft.agent");
  return (
    <section className="draft-banner" aria-label={title}>
      <p className="draft-banner-title">{title}</p>
      <p className="draft-banner-text">{draft.content}</p>
      {tooLong ? <p className="draft-banner-warning">{t("draft.tooLong")}</p> : null}
      <div className="draft-banner-actions">
        <button type="button" className="btn btn-primary btn-sm" onClick={onSend} disabled={busy || tooLong} aria-label={t("draft.sendLabel")}>
          {t("actions.send")}
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onEdit} disabled={busy} aria-label={t("draft.editLabel")}>
          {t("actions.edit")}
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onDiscard} disabled={busy} aria-label={t("draft.discardLabel")}>
          {t("actions.discard")}
        </button>
      </div>
    </section>
  );
}
