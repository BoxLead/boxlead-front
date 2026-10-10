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
  return (
    <section className="draft-banner" aria-label={draft.agentName ? `Borrador de ${draft.agentName}` : "Borrador del agente"}>
      <p className="draft-banner-title">{draft.agentName ? `Borrador de ${draft.agentName}` : "Borrador del agente"}</p>
      <p className="draft-banner-text">{draft.content}</p>
      {tooLong ? <p className="draft-banner-warning">El borrador es más largo que el máximo de este canal. Editalo antes de enviarlo.</p> : null}
      <div className="draft-banner-actions">
        <button type="button" className="btn btn-primary btn-sm" onClick={onSend} disabled={busy || tooLong} aria-label="Enviar borrador">
          Enviar
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onEdit} disabled={busy} aria-label="Editar borrador">
          Editar
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onDiscard} disabled={busy} aria-label="Descartar borrador">
          Descartar
        </button>
      </div>
    </section>
  );
}
