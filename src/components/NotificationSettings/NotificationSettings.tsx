import { useId, useState } from "react";
import type { NotificationSettings as Settings } from "../../api/types";
import { useAuth } from "../../context/auth";
import { NOTIFICATION_SETTINGS_KEY, saveNotificationSettings } from "../../data/notifications";
import { setQueryData } from "../../data/queryCache";
import { useApiQuery } from "../../hooks/useApiQuery";
import { Banner } from "../ui/Banner";
import { Switch } from "../ui/Switch";
import { useToast } from "../ui/toast";
import { SystemNotifications } from "./SystemNotifications";
import "./NotificationSettings.css";

type SettingKey = keyof Settings;

const SAVE_ERROR = "No pudimos guardar el cambio. Probá de nuevo.";

function SettingsForm({ settings }: { settings: Settings }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  async function change(key: SettingKey, value: boolean) {
    const next = { ...settings, [key]: value };
    setQueryData<Settings>(NOTIFICATION_SETTINGS_KEY, () => next);
    setSaving(true);
    try {
      await saveNotificationSettings(next);
    } catch {
      setQueryData<Settings>(NOTIFICATION_SETTINGS_KEY, (current) => ({ ...(current ?? next), [key]: settings[key] }));
      toast({ tone: "danger", message: SAVE_ERROR });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="notification-settings-groups" aria-busy={saving}>
      <fieldset className="notification-settings-group">
        <legend className="notification-settings-legend">Por mail</legend>
        <div className="field">
          <Switch
            label="Mail cuando entra un lead nuevo"
            checked={settings.newLeadEmail}
            disabled={saving}
            onChange={(value) => void change("newLeadEmail", value)}
          />
          <span className="field-help">Juntamos los leads de unos minutos en un solo mail, con la cantidad por canal.</span>
        </div>
        <div className="field">
          <Switch
            label="Mail cuando el agente pasa una conversación a una persona"
            checked={settings.handoffEmail}
            disabled={saving}
            onChange={(value) => void change("handoffEmail", value)}
          />
          <span className="field-help">Te escribimos cuando una conversación necesita que respondas vos.</span>
        </div>
      </fieldset>
      <fieldset className="notification-settings-group">
        <legend className="notification-settings-legend">En el navegador</legend>
        <div className="field">
          <Switch
            label="Avisos en el navegador con la app abierta"
            checked={settings.browser}
            disabled={saving}
            onChange={(value) => void change("browser", value)}
          />
          <span className="field-help">Mostramos un aviso en pantalla y sumamos la cantidad al título de la pestaña.</span>
        </div>
        <SystemNotifications browserOn={settings.browser} />
      </fieldset>
    </div>
  );
}

function SettingsPanel() {
  const titleId = useId();
  const settings = useApiQuery<Settings>(NOTIFICATION_SETTINGS_KEY);

  return (
    <section className="panel notification-settings" aria-labelledby={titleId}>
      <div className="notification-settings-head">
        <h2 id={titleId} className="panel-title">
          Cómo te avisamos
        </h2>
        <p className="notification-settings-desc">
          Te avisamos cuando entra un lead nuevo o cuando una conversación necesita una persona. Los avisos nunca muestran
          nombres ni mensajes.
        </p>
      </div>
      {settings.data ? (
        <SettingsForm settings={settings.data} />
      ) : settings.error ? (
        <Banner
          tone="danger"
          title="No pudimos cargar tus preferencias"
          action={
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => void settings.reload()}>
              Reintentar
            </button>
          }
        >
          {settings.error}
        </Banner>
      ) : (
        <div className="notification-settings-loading" role="status" aria-label="Cargando preferencias">
          <span className="skeleton notification-settings-skeleton" />
          <span className="skeleton notification-settings-skeleton" />
          <span className="skeleton notification-settings-skeleton" />
        </div>
      )}
    </section>
  );
}

export function NotificationSettings() {
  const { features } = useAuth();
  return features.notifications ? <SettingsPanel /> : null;
}
