import { useId, useState } from "react";
import { adminApi } from "../../api/client";
import { DataTable } from "../../components/list/DataTable";
import { ReasonDialog } from "../../components/ReasonDialog";
import { formatDate } from "../../format";
import { addDays, endOfDay, isDay, today } from "./dates";
import { LIMIT_LABELS } from "./labels";
import { COST_CAP_CURRENCY, formatLimit, isSwitch, MICROS, USER_LIMIT_KEYS } from "./limits";
import { Muted, Section } from "./parts";
import type { EntitlementKey, Entitlements, Override } from "./types";
import { invalid, useActionDialogs } from "./useActionDialogs";

type LimitsPanelProps = {
  userId: string;
  entitlements: Entitlements;
  overrides: Override[];
  canOperate: boolean;
  onChanged: () => void;
};

type Row = { key: EntitlementKey; value: number | null | undefined; override: Override | undefined };
type Dialog = `set:${EntitlementKey}` | `revoke:${EntitlementKey}`;
type Run = (call: () => Promise<unknown>, message: string) => Promise<void>;

function lower(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function overrideText(row: Row): string {
  if (!row.override) return "—";
  const value = formatLimit(row.key, row.override.value);
  return row.override.expiresAt ? `${value} hasta el ${formatDate(row.override.expiresAt)}` : value;
}

function parseValue(key: EntitlementKey, raw: string): number {
  const text = raw.trim().replace(",", ".");
  const number = Number(text);
  if (text === "" || !Number.isFinite(number) || number < 0) invalid("Ingresá un valor de 0 en adelante.");
  if (key === "LLM_COST_CAP_MICROS") return Math.round(number * MICROS);
  if (!Number.isInteger(number)) invalid("Ingresá un número entero.");
  return number;
}

function initialValue(row: Row): string {
  const current = row.value ?? 0;
  if (isSwitch(row.key)) return current > 0 ? "0" : "1";
  if (row.value === null) return "";
  return row.key === "LLM_COST_CAP_MICROS" ? String(current / MICROS) : String(current);
}

function OverrideDialog({ userId, row, onClose, run }: { userId: string; row: Row; onClose: () => void; run: Run }) {
  const switchKey = isSwitch(row.key);
  const [unlimited, setUnlimited] = useState(false);
  const [value, setValue] = useState(() => initialValue(row));
  const [expires, setExpires] = useState("");
  const valueId = useId();
  const unlimitedId = useId();
  const expiresId = useId();
  const tomorrow = addDays(today(), 1);
  const label = LIMIT_LABELS[row.key];

  function confirm(reason: string) {
    if (expires && (!isDay(expires) || expires < tomorrow)) invalid("El vencimiento tiene que ser a partir de mañana.");
    const amount = unlimited ? { unlimited: true } : { value: parseValue(row.key, value) };
    const body = { ...amount, ...(expires ? { expiresAt: endOfDay(expires) } : {}), reason };
    return run(() => adminApi.put(`/admin/customers/${userId}/overrides/${row.key}`, body), `Ajustamos ${lower(label)}.`);
  }

  return (
    <ReasonDialog open title={`Ajustar ${lower(label)}`} confirmLabel="Guardar ajuste" onClose={onClose} onConfirm={confirm}>
      <p>
        Hoy rige {formatLimit(row.key, row.value)}. El ajuste pisa el valor del plan solo para este usuario
        {row.override ? " y reemplaza el ajuste que tiene" : ""}.
      </p>
      {switchKey ? (
        <div className="field">
          <label className="field-label" htmlFor={valueId}>
            Valor
          </label>
          <select id={valueId} className="select" value={value} onChange={(event) => setValue(event.target.value)}>
            <option value="1">Sí</option>
            <option value="0">No</option>
          </select>
        </div>
      ) : (
        <>
          <label className="customer-check" htmlFor={unlimitedId}>
            <input id={unlimitedId} type="checkbox" checked={unlimited} onChange={(event) => setUnlimited(event.target.checked)} />
            Sin tope
          </label>
          {unlimited ? null : (
            <div className="field">
              <label className="field-label" htmlFor={valueId}>
                {row.key === "LLM_COST_CAP_MICROS" ? `Valor en ${COST_CAP_CURRENCY}` : "Valor"}
              </label>
              <input
                id={valueId}
                className="input"
                type="number"
                inputMode="decimal"
                min={0}
                step={row.key === "LLM_COST_CAP_MICROS" ? "0.01" : "1"}
                value={value}
                onChange={(event) => setValue(event.target.value)}
              />
            </div>
          )}
        </>
      )}
      <div className="field">
        <label className="field-label" htmlFor={expiresId}>
          Vence
        </label>
        <input
          id={expiresId}
          className="input"
          type="date"
          min={tomorrow}
          value={expires}
          onChange={(event) => setExpires(event.target.value)}
        />
        <span className="field-help">Vacío no vence. Si elegís un día, vence al final de ese día en hora de Argentina.</span>
      </div>
    </ReasonDialog>
  );
}

export function LimitsPanel({ userId, entitlements, overrides, canOperate, onChanged }: LimitsPanelProps) {
  const dialogs = useActionDialogs<Dialog>(onChanged);
  const rows: Row[] = USER_LIMIT_KEYS.map((key) => ({
    key,
    value: entitlements.limits[key],
    override: overrides.find((override) => override.key === key),
  }));
  const editing = rows.find((row) => dialogs.open === `set:${row.key}`);
  const revoking = rows.find((row) => dialogs.open === `revoke:${row.key}`);

  return (
    <Section title="Límites" hint="Lo que rige hoy, con los ajustes vigentes de este usuario." flush wide>
      {entitlements.enforced ? null : <Muted>Los límites todavía no se aplican a nadie. Igual se pueden ajustar.</Muted>}
      <DataTable
          caption="Límites"
          rows={rows}
          rowKey={(row) => row.key}
          columns={[
            { key: "label", header: "Límite", width: "md", cell: (row) => LIMIT_LABELS[row.key] },
            { key: "value", header: "Rige", type: "number", cell: (row) => formatLimit(row.key, row.value) },
            {
              key: "override",
              header: "Ajuste",
              width: "md",
              cell: (row) => (
                <span className="cell-stack">
                  <span>{overrideText(row)}</span>
                  {row.override ? <span className="sub-text">{row.override.reason}</span> : null}
                </span>
              ),
            },
            ...(canOperate
              ? [
                  {
                    key: "actions",
                    header: "Acciones",
                    type: "actions" as const,
                    cell: (row: Row) => (
                      <div className="customer-row-actions">
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          aria-label={`Ajustar ${lower(LIMIT_LABELS[row.key])}`}
                          onClick={() => dialogs.show(`set:${row.key}`)}
                        >
                          Ajustar
                        </button>
                        {row.override ? (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            aria-label={`Quitar el ajuste de ${lower(LIMIT_LABELS[row.key])}`}
                            onClick={() => dialogs.show(`revoke:${row.key}`)}
                          >
                            Quitar ajuste
                          </button>
                        ) : null}
                      </div>
                    ),
                  },
                ]
              : []),
          ]}
        />
      {editing ? <OverrideDialog userId={userId} row={editing} onClose={dialogs.close} run={dialogs.run} /> : null}
      <ReasonDialog
        open={revoking !== undefined}
        title="Quitar ajuste"
        confirmLabel="Quitar ajuste"
        tone="danger"
        onClose={dialogs.close}
        onConfirm={(reason) =>
          revoking
            ? dialogs.run(() => adminApi.delete(`/admin/customers/${userId}/overrides/${revoking.key}`, { reason }), "Quitamos el ajuste.")
            : Promise.resolve()
        }
      >
        {revoking ? (
          <p>
            {LIMIT_LABELS[revoking.key]} deja de valer {formatLimit(revoking.key, revoking.override?.value)} y vuelve al valor del plan.
          </p>
        ) : null}
      </ReasonDialog>
    </Section>
  );
}
