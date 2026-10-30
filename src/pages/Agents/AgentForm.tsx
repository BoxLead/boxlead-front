import i18next from "i18next";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { ApiError } from "../../api/client";
import type { AgentResponse, AgentScope, CategoryResponse } from "../../api/types";
import { CharCounter } from "../../components/ui/CharCounter";
import { Switch } from "../../components/ui/Switch";
import { createAgent, updateAgent } from "../../data/agents";
import {
  AGENT_INSTRUCTIONS_MAX,
  AGENT_NAME_MAX,
  MAX_SCOPES,
  agentErrorMessage,
  emptyScope,
  hasDuplicateScopes,
  isOrphanedCategory,
  newScopeDraft,
  type ScopeDraft,
} from "../../util/agents";
import { ScopesEditor } from "./ScopesEditor";

export type AgentDraftSnapshot = {
  name: string;
  instructions: string;
};

type AgentFormProps = {
  agent: AgentResponse | null;
  categories: CategoryResponse[] | undefined;
  onSaved: (saved: AgentResponse, created: boolean) => void;
  onDiscardNew: () => void;
  onDirtyChange: (dirty: boolean) => void;
  onSnapshot: (snapshot: AgentDraftSnapshot) => void;
};

function initialDrafts(agent: AgentResponse | null): ScopeDraft[] {
  if (!agent) return [newScopeDraft()];
  return agent.scopes.map(({ platform, categoryId, salesStage, replyMode }) =>
    newScopeDraft({ platform, categoryId, salesStage, replyMode }),
  );
}

function scopeProblem(drafts: ScopeDraft[], categories: CategoryResponse[] | undefined): string | null {
  if (drafts.length === 0 || drafts.length > MAX_SCOPES) return `Usá entre 1 y ${MAX_SCOPES} reglas.`;
  if (hasDuplicateScopes(drafts.map((draft) => draft.scope))) return "Hay reglas repetidas: cada combinación solo puede estar una vez.";
  if (drafts.some((draft) => isOrphanedCategory(draft.scope, categories))) return "Quitá las reglas con categorías que ya no existen.";
  return null;
}

function sameScope(left: AgentScope, right: AgentScope): boolean {
  return (
    left.platform === right.platform &&
    left.categoryId === right.categoryId &&
    left.salesStage === right.salesStage &&
    left.replyMode === right.replyMode
  );
}

export function AgentForm({ agent, categories, onSaved, onDiscardNew, onDirtyChange, onSnapshot }: AgentFormProps) {
  const nameCounterId = useId();
  const instructionsCounterId = useId();
  const [name, setName] = useState(agent?.name ?? "");
  const [instructions, setInstructions] = useState(agent?.instructions ?? "");
  const [publicCommentReplies, setPublicCommentReplies] = useState(agent?.publicCommentReplies ?? false);
  const [drafts, setDrafts] = useState<ScopeDraft[]>(() => initialDrafts(agent));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onDirtyChangeRef = useRef(onDirtyChange);
  const onSnapshotRef = useRef(onSnapshot);

  useEffect(() => {
    onDirtyChangeRef.current = onDirtyChange;
    onSnapshotRef.current = onSnapshot;
  });

  const savedScopes = agent
    ? agent.scopes.map(({ platform, categoryId, salesStage, replyMode }) => ({
        platform,
        categoryId,
        salesStage,
        replyMode,
      }))
    : [emptyScope()];
  const scopesMatch =
    drafts.length === savedScopes.length && drafts.every((draft, index) => sameScope(draft.scope, savedScopes[index]));
  const dirty =
    name !== (agent?.name ?? "") ||
    instructions !== (agent?.instructions ?? "") ||
    publicCommentReplies !== (agent?.publicCommentReplies ?? false) ||
    !scopesMatch;

  useEffect(() => {
    onSnapshotRef.current({ name, instructions });
    onDirtyChangeRef.current(dirty);
  }, [name, instructions, dirty]);

  const trimmed = name.trim();
  const problem = scopeProblem(drafts, categories);
  const invalid =
    trimmed.length === 0 ||
    name.length > AGENT_NAME_MAX ||
    instructions.length > AGENT_INSTRUCTIONS_MAX ||
    problem !== null;

  function discard() {
    if (!agent) {
      onDiscardNew();
      return;
    }
    setName(agent.name);
    setInstructions(agent.instructions);
    setPublicCommentReplies(agent.publicCommentReplies);
    setDrafts(initialDrafts(agent));
    setError(null);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (invalid || saving) return;
    setSaving(true);
    setError(null);
    const body = {
      name: trimmed,
      instructions: instructions.trim(),
      enabled: agent?.enabled ?? true,
      publicCommentReplies,
      scopes: drafts.map((draft) => draft.scope),
    };
    try {
      const saved = agent ? await updateAgent(agent.id, body) : await createAgent(body);
      onSaved(saved, agent === null);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? agentErrorMessage(e, "No pudimos guardar el agente. Probá de nuevo.")
          : "No pudimos guardar el agente. Probá de nuevo.",
      );
      setSaving(false);
    }
  }

  return (
    <form className="agent-config" aria-label="Configuración del agente" onSubmit={(event) => void submit(event)} noValidate>
      <div className="agent-config-body">
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="agent-form-grid">
          <div className="agent-form-main">
            <label className="field">
              <span className="field-label">Nombre</span>
              <input
                className="input"
                name="name"
                value={name}
                autoComplete="off"
                required
                placeholder="Por ejemplo, Ventas"
                aria-invalid={name.length > AGENT_NAME_MAX || undefined}
                aria-describedby={nameCounterId}
                onChange={(event) => setName(event.target.value)}
              />
              <CharCounter id={nameCounterId} length={name.length} max={AGENT_NAME_MAX} overLimitLabel={i18next.t("ui.overLimit", { ns: "shell" })} />
            </label>
            <label className="field">
              <span className="field-label">Instrucciones</span>
              <textarea
                className="input agent-textarea"
                name="instructions"
                rows={8}
                value={instructions}
                placeholder="Cómo querés que responda: estrategia, personalidad, qué ofrecer y qué evitar"
                aria-invalid={instructions.length > AGENT_INSTRUCTIONS_MAX || undefined}
                aria-describedby={instructionsCounterId}
                onChange={(event) => setInstructions(event.target.value)}
              />
              <CharCounter id={instructionsCounterId} length={instructions.length} max={AGENT_INSTRUCTIONS_MAX} overLimitLabel={i18next.t("ui.overLimit", { ns: "shell" })} />
            </label>
            <div className="field">
              <Switch
                label="Responder comentarios en público"
                checked={publicCommentReplies}
                disabled={saving}
                onChange={setPublicCommentReplies}
              />
              <span className="field-help">
                La respuesta se publica en el comentario. Si el agente no está seguro, se lo deja a una persona.
              </span>
            </div>
          </div>
          <ScopesEditor drafts={drafts} categories={categories} onChange={setDrafts} />
        </div>
        {problem ? (
          <p className="field-error" role="alert">
            {problem}
          </p>
        ) : null}
      </div>
      <div className="agent-savebar">
        <button type="button" className="btn btn-secondary" onClick={discard} disabled={saving || (agent !== null && !dirty)}>
          Descartar
        </button>
        <button type="submit" className="btn btn-primary" disabled={invalid || saving}>
          {saving ? "Guardando…" : agent ? "Guardar cambios" : "Crear agente"}
        </button>
      </div>
    </form>
  );
}
