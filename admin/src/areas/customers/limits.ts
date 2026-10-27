import { formatCount } from "../../format";
import { ENTITLEMENT_KEYS, type EntitlementKey } from "./types";

export const MICROS = 1_000_000;
export const COST_CAP_CURRENCY = "USD";

export const SWITCH_KEYS: readonly EntitlementKey[] = ["PUBLIC_COMMENT_REPLIES", "AUTO_CATEGORIZE"];

export const USER_LIMIT_KEYS = ENTITLEMENT_KEYS.filter((key) => key !== "DEMO_DURATION_DAYS");

export function isSwitch(key: EntitlementKey): boolean {
  return SWITCH_KEYS.includes(key);
}

export function formatMicros(micros: number, currency: string): string {
  try {
    return new Intl.NumberFormat("es-AR", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(
      micros / MICROS,
    );
  } catch {
    return `${currency} ${micros / MICROS}`;
  }
}

export function formatLimit(key: EntitlementKey, value: number | null | undefined): string {
  if (value === null) return "Sin tope";
  if (value === undefined) return "—";
  if (isSwitch(key)) return value > 0 ? "Sí" : "No";
  if (key === "LLM_COST_CAP_MICROS") return formatMicros(value, COST_CAP_CURRENCY);
  return formatCount(value);
}
