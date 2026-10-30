import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { ApiError } from "../../api/client";
import type { MetricsSettings } from "../../api/types";
import { Dialog } from "../../components/ui/Dialog";
import { saveMetricsSettings } from "../../data/metrics";
import { WEEKDAYS, weekdayName, weekdayShort } from "../../util/metrics";
import { draftFrom, toSettings, validate, type SettingsDraft } from "./settingsForm";
import "./SettingsDialog.css";

type SettingsDialogProps = {
  open: boolean;
  settings: MetricsSettings;
  onClose: () => void;
  onSaved: () => void;
};

const OPENING_HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const CLOSING_HOURS = Array.from({ length: 24 }, (_, hour) => hour + 1);

export function SettingsDialog({ open, settings, onClose, onSaved }: SettingsDialogProps) {
  const { t } = useTranslation("metrics");
  const [draft, setDraft] = useState<SettingsDraft>(() => draftFrom(settings));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errors = validate(draft);
  const invalid = errors.minutes || errors.hours;
  const noHours = draft.weekdays.length === 0;

  const update = (patch: Partial<SettingsDraft>) => setDraft((current) => ({ ...current, ...patch }));

  function toggleDay(day: number) {
    update({
      weekdays: draft.weekdays.includes(day) ? draft.weekdays.filter((item) => item !== day) : [...draft.weekdays, day],
    });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (invalid || saving) return;
    setSaving(true);
    setError(null);
    try {
      await saveMetricsSettings(toSettings(draft));
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("settings.saveFailed"));
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      title={t("settings.title")}
      description={t("settings.description")}
      busy={saving}
      onClose={onClose}
    >
      <form className="dialog-form" onSubmit={(event) => void submit(event)} noValidate>
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        <label className="field">
          <span className="field-label">{t("settings.minutes")}</span>
          <input
            className="input"
            name="manualReplyMinutes"
            type="number"
            min={1}
            max={60}
            value={draft.minutes}
            aria-invalid={errors.minutes || undefined}
            onChange={(event) => update({ minutes: event.target.value })}
          />
          <span className="field-help">{t("settings.minutesHelp")}</span>
        </label>
        <fieldset className="field">
          <legend className="field-label">{t("settings.businessHours")}</legend>
          <div className="settings-days">
            {WEEKDAYS.map((day, index) => (
              <label key={day} className="settings-day">
                <input type="checkbox" checked={draft.weekdays.includes(index)} onChange={() => toggleDay(index)} />
                <span aria-hidden="true">{weekdayShort(index)}</span>
                <span className="visually-hidden">{weekdayName(index)}</span>
              </label>
            ))}
          </div>
          <div className="settings-range">
            <label className="field">
              <span className="field-help">{t("settings.from")}</span>
              <select
                className="select"
                value={draft.from}
                disabled={noHours}
                onChange={(event) => update({ from: Number(event.target.value) })}
              >
                {OPENING_HOURS.map((hour) => (
                  <option key={hour} value={hour}>
                    {t("settings.hour", { hour })}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-help">{t("settings.to")}</span>
              <select
                className="select"
                value={draft.to}
                disabled={noHours}
                aria-invalid={errors.hours || undefined}
                onChange={(event) => update({ to: Number(event.target.value) })}
              >
                {CLOSING_HOURS.map((hour) => (
                  <option key={hour} value={hour}>
                    {t("settings.hour", { hour })}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {errors.hours ? <p className="field-error">{t("settings.hoursError")}</p> : null}
        </fieldset>
        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            {t("settings.cancel")}
          </button>
          <button type="submit" className="btn btn-primary" disabled={invalid || saving}>
            {saving ? t("settings.saving") : t("settings.save")}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
