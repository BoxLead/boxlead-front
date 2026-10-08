import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { ApiError } from "../../api/client";
import type { MetricsSettings } from "../../api/types";
import { saveMetricsSettings } from "../../data/metrics";
import { WEEKDAYS, WEEKDAYS_SHORT } from "../../util/metrics";
import "./SettingsDialog.css";

type SettingsDialogProps = {
  open: boolean;
  settings: MetricsSettings;
  onClose: () => void;
  onSaved: () => void;
};

const HOURS = Array.from({ length: 25 }, (_, hour) => hour);

export function SettingsDialog({ open, settings, onClose, onSaved }: SettingsDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [ticket, setTicket] = useState(settings.averageTicket === null ? "" : String(settings.averageTicket));
  const [minutes, setMinutes] = useState(String(settings.manualReplyMinutes));
  const [weekdays, setWeekdays] = useState<number[]>(settings.businessHours?.weekdays ?? []);
  const [from, setFrom] = useState(settings.businessHours?.from ?? 9);
  const [to, setTo] = useState(settings.businessHours?.to ?? 18);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal?.();
    if (!open && dialog.open) dialog.close?.();
  }, [open]);

  const ticketValue = ticket.trim() === "" ? null : Number(ticket);
  const minutesValue = Number(minutes);
  const ticketInvalid = ticketValue !== null && (!Number.isFinite(ticketValue) || ticketValue <= 0);
  const minutesInvalid = !Number.isInteger(minutesValue) || minutesValue < 1 || minutesValue > 60;
  const hoursInvalid = weekdays.length > 0 && to <= from;
  const invalid = ticketInvalid || minutesInvalid || hoursInvalid;

  function toggleDay(day: number) {
    setWeekdays((current) => (current.includes(day) ? current.filter((item) => item !== day) : [...current, day].sort()));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (invalid || saving) return;
    setSaving(true);
    setError(null);
    try {
      await saveMetricsSettings({
        averageTicket: ticketValue,
        currency: settings.currency,
        manualReplyMinutes: minutesValue,
        businessHours: weekdays.length > 0 ? { weekdays, from, to } : null,
      });
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No pudimos guardar los supuestos. Probá de nuevo.");
      setSaving(false);
    }
  }

  return (
    <dialog
      ref={ref}
      className="settings-dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (!saving) onClose();
      }}
    >
      {open ? (
        <form className="settings-dialog-body" onSubmit={(event) => void submit(event)} noValidate>
          <div className="settings-dialog-head">
            <h2 id={titleId} className="settings-dialog-title">
              Supuestos de las estimaciones
            </h2>
            <p className="settings-dialog-hint">Se usan para calcular ingresos, horas ahorradas y consultas fuera de horario.</p>
          </div>
          {error ? (
            <p className="settings-dialog-error" role="alert">
              {error}
            </p>
          ) : null}
          <label className="settings-field">
            <span className="settings-field-label">Ticket promedio ({settings.currency})</span>
            <input
              className="settings-input"
              name="averageTicket"
              inputMode="decimal"
              value={ticket}
              placeholder="Sin cargar"
              aria-invalid={ticketInvalid || undefined}
              onChange={(event) => setTicket(event.target.value.replace(/[^\d.]/g, ""))}
            />
            <span className="settings-field-help">Lo que gasta en promedio un cliente en cada compra.</span>
          </label>
          <label className="settings-field">
            <span className="settings-field-label">Minutos por respuesta manual</span>
            <input
              className="settings-input"
              name="manualReplyMinutes"
              type="number"
              min={1}
              max={60}
              value={minutes}
              aria-invalid={minutesInvalid || undefined}
              onChange={(event) => setMinutes(event.target.value)}
            />
            <span className="settings-field-help">Cuánto tarda una persona del equipo en leer y contestar un mensaje.</span>
          </label>
          <fieldset className="settings-field settings-hours">
            <legend className="settings-field-label">Horario de atención</legend>
            <div className="settings-days">
              {WEEKDAYS_SHORT.map((day, index) => (
                <label key={day} className="settings-day">
                  <input type="checkbox" checked={weekdays.includes(index)} onChange={() => toggleDay(index)} />
                  <span aria-hidden="true">{day}</span>
                  <span className="visually-hidden">{WEEKDAYS[index]}</span>
                </label>
              ))}
            </div>
            <div className="settings-range">
              <label>
                <span>Desde</span>
                <select value={from} disabled={weekdays.length === 0} onChange={(event) => setFrom(Number(event.target.value))}>
                  {HOURS.slice(0, 24).map((hour) => (
                    <option key={hour} value={hour}>
                      {hour} h
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Hasta</span>
                <select
                  value={to}
                  disabled={weekdays.length === 0}
                  aria-invalid={hoursInvalid || undefined}
                  onChange={(event) => setTo(Number(event.target.value))}
                >
                  {HOURS.slice(1).map((hour) => (
                    <option key={hour} value={hour}>
                      {hour} h
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {hoursInvalid ? <span className="settings-field-error">El cierre tiene que ser después de la apertura.</span> : null}
          </fieldset>
          <div className="settings-dialog-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={invalid || saving}>
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      ) : null}
    </dialog>
  );
}
