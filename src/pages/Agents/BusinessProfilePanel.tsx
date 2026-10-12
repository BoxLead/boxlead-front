import { useId, useState, type FormEvent } from "react";
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
  const toast = useToast();
  const descriptionCounterId = useId();
  const toneCounterId = useId();
  const [description, setDescription] = useState(profile.description);
  const [tone, setTone] = useState(profile.tone ?? "");
  const [autoCategorize, setAutoCategorize] = useState(profile.autoCategorize);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    description !== profile.description || tone !== (profile.tone ?? "") || autoCategorize !== profile.autoCategorize;
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
      });
      setDescription(saved.description);
      setTone(saved.tone ?? "");
      setAutoCategorize(saved.autoCategorize);
      toast({ message: "Guardaste el contexto del negocio." });
    } catch (e) {
      setError(agentErrorMessage(e, "No pudimos guardar el contexto. Probá de nuevo."));
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
        <span className="field-label">Qué hace tu negocio</span>
        <textarea
          className="input agent-textarea"
          name="description"
          rows={6}
          value={description}
          placeholder="Qué vendés, precios de referencia, horarios, envíos, medios de pago, políticas y preguntas frecuentes"
          aria-invalid={description.length > PROFILE_DESCRIPTION_MAX || undefined}
          aria-describedby={descriptionCounterId}
          onChange={(event) => setDescription(event.target.value)}
        />
        <CharCounter id={descriptionCounterId} length={description.length} max={PROFILE_DESCRIPTION_MAX} />
      </label>
      <label className="field">
        <span className="field-label">Tono</span>
        <input
          className="input"
          name="tone"
          value={tone}
          autoComplete="off"
          placeholder="Por ejemplo, cercano y directo"
          aria-invalid={tone.length > PROFILE_TONE_MAX || undefined}
          aria-describedby={toneCounterId}
          onChange={(event) => setTone(event.target.value)}
        />
        <CharCounter id={toneCounterId} length={tone.length} max={PROFILE_TONE_MAX} />
      </label>
      <div className="field">
        <Switch label="Categorizar leads automáticamente" checked={autoCategorize} onChange={setAutoCategorize} />
        <span className="field-help">Los agentes eligen una categoría para los leads que todavía no tienen una.</span>
      </div>
      <div className="profile-actions">
        <button type="submit" className="btn btn-primary" disabled={!dirty || invalid || saving}>
          {saving ? "Guardando…" : "Guardar contexto"}
        </button>
      </div>
    </form>
  );
}

export function BusinessProfilePanel() {
  const profile = useApiQuery<BusinessProfile>(BUSINESS_PROFILE_KEY);

  return (
    <section className="panel profile-panel" aria-labelledby="profile-title">
      <div className="profile-head">
        <h2 id="profile-title" className="panel-title">
          Contexto del negocio
        </h2>
        <p className="page-header-desc">Todos tus agentes usan esta información para responder sin inventar datos.</p>
      </div>
      {profile.error && !profile.data ? (
        <Banner
          tone="danger"
          title="No pudimos cargar el contexto"
          action={
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => void profile.reload()}>
              Reintentar
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
