import { useId, useState, type FormEvent } from "react";
import { ApiError } from "../../api/client";
import type { AgentResponse, CategoryResponse } from "../../api/types";
import { CharCounter } from "../../components/ui/CharCounter";
import { Dialog } from "../../components/ui/Dialog";
import { createAgent, updateAgent } from "../../data/agents";
import {
  AGENT_INSTRUCTIONS_MAX,
  AGENT_NAME_MAX,
  MAX_SCOPES,
  agentErrorMessage,
  hasDuplicateScopes,
  isOrphanedCategory,
  newScopeDraft,
  type ScopeDraft,
} from "../../util/agents";
import { ScopesEditor } from "./ScopesEditor";

type AgentDialogProps = {
  open: boolean;
  agent: AgentResponse | null;
  categories: CategoryResponse[] | undefined;
  onClose: () => void;
  onSaved: (saved: AgentResponse, created: boolean) => void;
  onTest: (draft: { name: string; instructions: string }) => void;
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

export function AgentDialog({ open, agent, categories, onClose, onSaved, onTest }: AgentDialogProps) {
  const nameCounterId = useId();
  const instructionsCounterId = useId();
  const [name, setName] = useState(agent?.name ?? "");
  const [instructions, setInstructions] = useState(agent?.instructions ?? "");
  const [drafts, setDrafts] = useState<ScopeDraft[]>(() => initialDrafts(agent));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = name.trim();
  const problem = scopeProblem(drafts, categories);
  const invalid =
    trimmed.length === 0 ||
    name.length > AGENT_NAME_MAX ||
    instructions.length > AGENT_INSTRUCTIONS_MAX ||
    problem !== null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (invalid || saving) return;
    setSaving(true);
    setError(null);
    const body = {
      name: trimmed,
      instructions: instructions.trim(),
      enabled: agent?.enabled ?? true,
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
    <Dialog open={open} title={agent ? "Editar agente" : "Nuevo agente"} size="lg" busy={saving} onClose={onClose}>
      <form className="dialog-form" onSubmit={(event) => void submit(event)} noValidate>
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
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
          <CharCounter id={nameCounterId} length={name.length} max={AGENT_NAME_MAX} />
        </label>
        <label className="field">
          <span className="field-label">Instrucciones</span>
          <textarea
            className="input agent-textarea"
            name="instructions"
            rows={5}
            value={instructions}
            placeholder="Cómo querés que responda: estrategia, personalidad, qué ofrecer y qué evitar"
            aria-invalid={instructions.length > AGENT_INSTRUCTIONS_MAX || undefined}
            aria-describedby={instructionsCounterId}
            onChange={(event) => setInstructions(event.target.value)}
          />
          <CharCounter id={instructionsCounterId} length={instructions.length} max={AGENT_INSTRUCTIONS_MAX} />
        </label>
        <ScopesEditor drafts={drafts} categories={categories} onChange={setDrafts} />
        {problem ? (
          <p className="field-error" role="alert">
            {problem}
          </p>
        ) : null}
        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onTest({ name: trimmed, instructions: instructions.trim() })}
            disabled={trimmed.length === 0 || name.length > AGENT_NAME_MAX || saving}
          >
            Probar agente
          </button>
          <button type="submit" className="btn btn-primary" disabled={invalid || saving}>
            {saving ? "Guardando…" : agent ? "Guardar cambios" : "Crear agente"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
