import { useState, type FormEvent } from "react";
import { ApiError } from "../../api/client";
import type { MetricsSettings } from "../../api/types";
import { Dialog } from "../../components/ui/Dialog";
import { saveMetricsSettings } from "../../data/metrics";
import { WEEKDAYS, WEEKDAYS_SHORT } from "../../util/metrics";
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
      setError(e instanceof ApiError ? e.message : "No pudimos guardar los supuestos. Probá de nuevo.");
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      title="Supuestos"
      description="Se usan para calcular las horas ahorradas y las consultas fuera de horario."
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
          <span className="field-label">Minutos por respuesta manual</span>
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
          <span className="field-help">Cuánto tarda una persona del equipo en leer y contestar un mensaje.</span>
        </label>
        <fieldset className="field">
          <legend className="field-label">Horario de atención</legend>
          <div className="settings-days">
            {WEEKDAYS_SHORT.map((day, index) => (
              <label key={day} className="settings-day">
                <input type="checkbox" checked={draft.weekdays.includes(index)} onChange={() => toggleDay(index)} />
                <span aria-hidden="true">{day}</span>
                <span className="visually-hidden">{WEEKDAYS[index]}</span>
              </label>
            ))}
          </div>
          <div className="settings-range">
            <label className="field">
              <span className="field-help">Desde</span>
              <select
                className="select"
                value={draft.from}
                disabled={noHours}
                onChange={(event) => update({ from: Number(event.target.value) })}
              >
                {OPENING_HOURS.map((hour) => (
                  <option key={hour} value={hour}>
                    {hour} h
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-help">Hasta</span>
              <select
                className="select"
                value={draft.to}
                disabled={noHours}
                aria-invalid={errors.hours || undefined}
                onChange={(event) => update({ to: Number(event.target.value) })}
              >
                {CLOSING_HOURS.map((hour) => (
                  <option key={hour} value={hour}>
                    {hour} h
                  </option>
                ))}
              </select>
            </label>
          </div>
          {errors.hours ? <p className="field-error">El cierre tiene que ser después de la apertura.</p> : null}
        </fieldset>
        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={invalid || saving}>
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
