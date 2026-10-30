import i18next from "i18next";
import { useId, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import type { BusinessProfile } from "../../api/types";
import { Banner } from "../../components/ui/Banner";
import { CharCounter } from "../../components/ui/CharCounter";
import { Switch } from "../../components/ui/Switch";
import { useToast } from "../../components/ui/toast";
import { BUSINESS_PROFILE_KEY, saveBusinessProfile } from "../../data/agents";
import { useApiQuery } from "../../hooks/useApiQuery";
import { PROFILE_DESCRIPTION_MAX, PROFILE_TONE_MAX, agentErrorMessage } from "../../util/agents";

type ProfileFormProps = {
  profile: BusinessProfile;
};

function ProfileForm({ profile }: ProfileFormProps) {
  const { t } = useTranslation("agents");
  const toast = useToast();
  const descriptionCounterId = useId();
  const toneCounterId = useId();
  const [description, setDescription] = useState(profile.description);
  const [tone, setTone] = useState(profile.tone ?? "");
  const [autoCategorize, setAutoCategorize] = useState(profile.autoCategorize);
  const [autoQualify, setAutoQualify] = useState(profile.autoQualify);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    description !== profile.description ||
    tone !== (profile.tone ?? "") ||
    autoCategorize !== profile.autoCategorize ||
    autoQualify !== profile.autoQualify;
  const invalid = description.length > PROFILE_DESCRIPTION_MAX || tone.length > PROFILE_TONE_MAX;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!dirty || invalid || saving) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await saveBusinessProfile({
        description: description.trim(),
        tone: tone.trim() || null,
        autoCategorize,
        autoQualify,
      });
      setDescription(saved.description);
      setTone(saved.tone ?? "");
      setAutoCategorize(saved.autoCategorize);
      setAutoQualify(saved.autoQualify);
      toast({ message: t("profile.saved") });
    } catch (e) {
      setError(agentErrorMessage(e, t("profile.saveFailed")));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="profile-form" onSubmit={(event) => void submit(event)} noValidate>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <label className="field">
        <span className="field-label">{t("profile.business")}</span>
        <textarea
          className="input agent-textarea"
          name="description"
          rows={6}
          value={description}
          placeholder={t("profile.businessPlaceholder")}
          aria-invalid={description.length > PROFILE_DESCRIPTION_MAX || undefined}
          aria-describedby={descriptionCounterId}
          onChange={(event) => setDescription(event.target.value)}
        />
        <CharCounter id={descriptionCounterId} length={description.length} max={PROFILE_DESCRIPTION_MAX} overLimitLabel={i18next.t("ui.overLimit", { ns: "shell" })} />
      </label>
      <label className="field">
        <span className="field-label">{t("profile.tone")}</span>
        <input
          className="input"
          name="tone"
          value={tone}
          autoComplete="off"
          placeholder={t("profile.tonePlaceholder")}
          aria-invalid={tone.length > PROFILE_TONE_MAX || undefined}
          aria-describedby={toneCounterId}
          onChange={(event) => setTone(event.target.value)}
        />
        <CharCounter id={toneCounterId} length={tone.length} max={PROFILE_TONE_MAX} overLimitLabel={i18next.t("ui.overLimit", { ns: "shell" })} />
      </label>
      <div className="field">
        <Switch label={t("profile.autoCategorize")} checked={autoCategorize} onChange={setAutoCategorize} />
        <span className="field-help">{t("profile.autoCategorizeHelp")}</span>
      </div>
      <div className="field">
        <Switch label={t("profile.autoQualify")} checked={autoQualify} onChange={setAutoQualify} />
        <span className="field-help">{t("profile.autoQualifyHelp")}</span>
      </div>
      <div className="profile-actions">
        <button type="submit" className="btn btn-primary" disabled={!dirty || invalid || saving}>
          {saving ? t("profile.saving") : t("profile.save")}
        </button>
      </div>
    </form>
  );
}

export function BusinessProfilePanel() {
  const { t } = useTranslation("agents");
  const profile = useApiQuery<BusinessProfile>(BUSINESS_PROFILE_KEY);

  return (
    <section className="panel profile-panel" aria-labelledby="profile-title">
      <div className="profile-head">
        <h2 id="profile-title" className="panel-title">
          {t("profile.title")}
        </h2>
        <p className="page-header-desc">{t("profile.description")}</p>
      </div>
      {profile.error && !profile.data ? (
        <Banner
          tone="danger"
          title={t("profile.loadFailed")}
          action={
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => void profile.reload()}>
              {t("profile.retry")}
            </button>
          }
        >
          {profile.error}
        </Banner>
      ) : profile.data ? (
        <ProfileForm profile={profile.data} />
      ) : (
        <div className="skeleton profile-skeleton" aria-hidden="true" />
      )}
    </section>
  );
}
