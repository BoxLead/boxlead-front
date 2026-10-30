import type { AgentScope, CategoryResponse, PlatformType, ReplyMode, SalesStage } from "../../api/types";
import { useTranslation } from "react-i18next";
import { Banner } from "../../components/ui/Banner";
import { CONNECTABLE_PLATFORMS, stageChoices } from "../../platforms";
import {
  MAX_SCOPES,
  REPLY_MODES,
  deletedCategoryLabel,
  newScopeDraft,
  replyModeLabel,
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
  const { t } = useTranslation("agents");
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
          {t("scopes.title")}
        </h3>
        <p className="field-help">{t("scopes.help")}</p>
      </div>
      <ol className="scope-list">
        {drafts.map(({ key, scope }, index) => {
          const orphaned = isOrphanedCategory(scope, categories);
          const stages = stageChoices(scope.platform);
          return (
            <li key={key}>
              <fieldset className="scope-row">
                <legend className="visually-hidden">{t("scopes.rule", { number: index + 1 })}</legend>
                <div className="scope-row-top">
                  <span className="scope-index" aria-hidden="true">
                    {index + 1}
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => remove(key)}
                    disabled={drafts.length === 1}
                    aria-label={t("scopes.removeLabel", { number: index + 1 })}
                  >
                    {t("scopes.remove")}
                  </button>
                </div>
                <label className="field">
                  <span className="field-label">{t("scopes.channel")}</span>
                  <select
                    className="select"
                    value={scope.platform ?? ANY}
                    onChange={(event) =>
                      update(key, withPlatform(scope, event.target.value === ANY ? null : (event.target.value as PlatformType)))
                    }
                  >
                    <option value={ANY}>{t("scopes.allChannels")}</option>
                    {CONNECTABLE_PLATFORMS.map((platform) => (
                      <option key={platform.id} value={platform.id}>
                        {platform.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span className="field-label">{t("scopes.category")}</span>
                  <select
                    className="select"
                    value={scope.categoryId ?? ANY}
                    aria-invalid={orphaned || undefined}
                    onChange={(event) => update(key, { ...scope, categoryId: event.target.value === ANY ? null : event.target.value })}
                  >
                    <option value={ANY}>{t("scopes.allCategories")}</option>
                    {orphaned && scope.categoryId ? <option value={scope.categoryId}>{deletedCategoryLabel()}</option> : null}
                    {(categories ?? []).map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span className="field-label">{t("scopes.stage")}</span>
                  <select
                    className="select"
                    value={scope.salesStage ?? ANY}
                    onChange={(event) =>
                      update(key, { ...scope, salesStage: event.target.value === ANY ? null : (event.target.value as SalesStage) })
                    }
                  >
                    <option value={ANY}>{t("scopes.allStages")}</option>
                    {stages.map((stage) => (
                      <option key={stage.value} value={stage.value}>
                        {stage.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span className="field-label">{t("scopes.mode")}</span>
                  <select
                    className="select"
                    value={scope.replyMode}
                    onChange={(event) => update(key, { ...scope, replyMode: event.target.value as ReplyMode })}
                  >
                    {REPLY_MODES.map((mode) => (
                      <option key={mode} value={mode}>
                        {replyModeLabel(mode)}
                      </option>
                    ))}
                  </select>
                </label>
                {orphaned ? (
                  <p className="field-error scope-row-error">{t("scopes.orphaned")}</p>
                ) : null}
              </fieldset>
            </li>
          );
        })}
      </ol>
      {drafts.length >= MAX_SCOPES ? (
        <Banner tone="info">{t("scopes.maxRules", { max: MAX_SCOPES })}</Banner>
      ) : (
        <button type="button" className="btn btn-secondary btn-sm scope-add" onClick={() => onChange([...drafts, newScopeDraft()])}>
          {t("scopes.add")}
        </button>
      )}
    </section>
  );
}
