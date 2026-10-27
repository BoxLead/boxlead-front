import type { FilterOption } from "../../components/list/Filters";
import {
  CODE_STATUS,
  COMMISSION_STATUS,
  PAYOUT_STATUS,
  planLabel,
  RESELLER_STATUS,
  SUBSCRIPTION_STATUS,
  type StatusLabel,
} from "../../status";
import type { AttributionSource, CommissionKind, CustomerMatch } from "./types";

type Label = StatusLabel;

export { CODE_STATUS, COMMISSION_STATUS, PAYOUT_STATUS, RESELLER_STATUS, SUBSCRIPTION_STATUS };

export const COMMISSION_KIND: Record<CommissionKind, string> = {
  ACCRUAL: "Comisión",
  REVERSAL: "Reversa",
};

export const ATTRIBUTION_SOURCE: Record<AttributionSource, string> = {
  COOKIE: "Link",
  INVITATION: "Invitación",
  ADMIN: "Corrección",
};

export const planName = planLabel;

export function optionsOf(labels: Record<string, Label>): FilterOption[] {
  return Object.entries(labels).map(([value, { label }]) => ({ value, label }));
}

export function formatRate(rateBps: number): string {
  return `${(rateBps / 100).toLocaleString("es-AR", { maximumFractionDigits: 2 })} %`;
}

export function shortId(id: string): string {
  return id.slice(0, 8);
}

export const VAT_CONDITIONS: readonly FilterOption[] = [
  { value: "RESPONSABLE_INSCRIPTO", label: "Responsable inscripto" },
  { value: "MONOTRIBUTO", label: "Monotributo" },
  { value: "EXENTO", label: "Exento" },
  { value: "CONSUMIDOR_FINAL", label: "Consumidor final" },
];

export function vatLabel(value: string | null): string {
  if (!value) return "—";
  return VAT_CONDITIONS.find((option) => option.value === value)?.label ?? value;
}

export function customerName(customer: CustomerMatch): string | null {
  return customer.legalName ?? customer.name;
}
