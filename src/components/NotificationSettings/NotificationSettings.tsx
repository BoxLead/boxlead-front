import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
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

function SettingsForm({ settings }: { settings: Settings }) {
  const { t } = useTranslation("account");
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
      toast({ tone: "danger", message: t("notifications.saveFailed") });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="notification-settings-groups" aria-busy={saving}>
      <fieldset className="notification-settings-group">
        <legend className="notification-settings-legend">{t("notifications.byEmail")}</legend>
        <div className="field">
          <Switch
            label={t("notifications.newLeadEmail")}
            checked={settings.newLeadEmail}
            disabled={saving}
            onChange={(value) => void change("newLeadEmail", value)}
          />
          <span className="field-help">{t("notifications.newLeadEmailHelp")}</span>
        </div>
        <div className="field">
          <Switch
            label={t("notifications.handoffEmail")}
            checked={settings.handoffEmail}
            disabled={saving}
            onChange={(value) => void change("handoffEmail", value)}
          />
          <span className="field-help">{t("notifications.handoffEmailHelp")}</span>
        </div>
      </fieldset>
      <fieldset className="notification-settings-group">
        <legend className="notification-settings-legend">{t("notifications.inBrowser")}</legend>
        <div className="field">
          <Switch
            label={t("notifications.browser")}
            checked={settings.browser}
            disabled={saving}
            onChange={(value) => void change("browser", value)}
          />
          <span className="field-help">{t("notifications.browserHelp")}</span>
        </div>
        <SystemNotifications browserOn={settings.browser} />
      </fieldset>
    </div>
  );
}

function SettingsPanel() {
  const { t } = useTranslation("account");
  const titleId = useId();
  const settings = useApiQuery<Settings>(NOTIFICATION_SETTINGS_KEY);

  return (
    <section className="panel notification-settings" aria-labelledby={titleId}>
      <div className="notification-settings-head">
        <h2 id={titleId} className="panel-title">
          {t("notifications.panelTitle")}
        </h2>
        <p className="notification-settings-desc">{t("notifications.panelDescription")}</p>
      </div>
      {settings.data ? (
        <SettingsForm settings={settings.data} />
      ) : settings.error ? (
        <Banner
          tone="danger"
          title={t("notifications.loadFailed")}
          action={
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => void settings.reload()}>
              {t("retry")}
            </button>
          }
        >
          {settings.error}
        </Banner>
      ) : (
        <div className="notification-settings-loading" role="status" aria-label={t("notifications.loading")}>
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
