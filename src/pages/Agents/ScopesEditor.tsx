import type { AgentScope, CategoryResponse, PlatformType, ReplyMode, SalesStage } from "../../api/types";
import { Banner } from "../../components/ui/Banner";
import { CONNECTABLE_PLATFORMS, stageChoices } from "../../platforms";
import {
  ALL_CATEGORIES,
  ALL_CHANNELS,
  ALL_STAGES,
  DELETED_CATEGORY,
  MAX_SCOPES,
  REPLY_MODES,
  REPLY_MODE_LABELS,
  newScopeDraft,
  isOrphanedCategory,
  withPlatform,
  type ScopeDraft,
} from "../../util/agents";

type ScopesEditorProps = {
  drafts: ScopeDraft[];
  categories: CategoryResponse[] | undefined;
  onChange: (drafts: ScopeDraft[]) => void;
};

const ANY = "";

export function ScopesEditor({ drafts, categories, onChange }: ScopesEditorProps) {
  function update(key: string, scope: AgentScope) {
    onChange(drafts.map((draft) => (draft.key === key ? { key, scope } : draft)));
  }

  function remove(key: string) {
    onChange(drafts.filter((draft) => draft.key !== key));
  }

  return (
    <section className="scopes-editor" aria-labelledby="scopes-editor-title">
      <div className="scopes-editor-head">
        <h3 id="scopes-editor-title" className="scopes-editor-title">
          Dónde trabaja
        </h3>
        <p className="field-help">
          Cada regla define un lugar y cómo responde ahí. Si varias reglas coinciden con una conversación, gana la más
          específica: primero la categoría, después la etapa y por último el canal.
        </p>
      </div>
      <ol className="scope-list">
        {drafts.map(({ key, scope }, index) => {
          const orphaned = isOrphanedCategory(scope, categories);
          const stages = stageChoices(scope.platform);
          return (
            <li key={key}>
              <fieldset className="scope-row">
                <legend className="visually-hidden">Regla {index + 1}</legend>
                <label className="field">
                  <span className="field-label">Canal</span>
                  <select
                    className="select"
                    value={scope.platform ?? ANY}
                    onChange={(event) =>
                      update(key, withPlatform(scope, event.target.value === ANY ? null : (event.target.value as PlatformType)))
                    }
                  >
                    <option value={ANY}>{ALL_CHANNELS}</option>
                    {CONNECTABLE_PLATFORMS.map((platform) => (
                      <option key={platform.id} value={platform.id}>
                        {platform.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span className="field-label">Categoría</span>
                  <select
                    className="select"
                    value={scope.categoryId ?? ANY}
                    aria-invalid={orphaned || undefined}
                    onChange={(event) => update(key, { ...scope, categoryId: event.target.value === ANY ? null : event.target.value })}
                  >
                    <option value={ANY}>{ALL_CATEGORIES}</option>
                    {orphaned && scope.categoryId ? <option value={scope.categoryId}>{DELETED_CATEGORY}</option> : null}
                    {(categories ?? []).map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span className="field-label">Etapa</span>
                  <select
                    className="select"
                    value={scope.salesStage ?? ANY}
                    onChange={(event) =>
                      update(key, { ...scope, salesStage: event.target.value === ANY ? null : (event.target.value as SalesStage) })
                    }
                  >
                    <option value={ANY}>{ALL_STAGES}</option>
                    {stages.map((stage) => (
                      <option key={stage.value} value={stage.value}>
                        {stage.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span className="field-label">Modo</span>
                  <select
                    className="select"
                    value={scope.replyMode}
                    onChange={(event) => update(key, { ...scope, replyMode: event.target.value as ReplyMode })}
                  >
                    {REPLY_MODES.map((mode) => (
                      <option key={mode} value={mode}>
                        {REPLY_MODE_LABELS[mode]}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm scope-remove"
                  onClick={() => remove(key)}
                  disabled={drafts.length === 1}
                  aria-label={`Quitar regla ${index + 1}`}
                >
                  Quitar
                </button>
                {orphaned ? (
                  <p className="field-error scope-row-error">Esta categoría ya no existe. Quitá la regla o elegí otra.</p>
                ) : null}
              </fieldset>
            </li>
          );
        })}
      </ol>
      {drafts.length >= MAX_SCOPES ? (
        <Banner tone="info">Podés tener hasta {MAX_SCOPES} reglas por agente.</Banner>
      ) : (
        <button type="button" className="btn btn-secondary btn-sm scope-add" onClick={() => onChange([...drafts, newScopeDraft()])}>
          Agregar regla
        </button>
      )}
    </section>
  );
}
