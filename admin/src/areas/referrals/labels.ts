import type { TagTone } from "../../../../src/components/ui/Tag";
import type { FilterOption } from "../../components/list/Filters";
import type {
  AttributionSource,
  CommissionKind,
  CommissionStatus,
  PayoutStatus,
  ReferralCodeStatus,
  ResellerStatus,
  CustomerMatch,
  SubscriptionStatus,
} from "./types";

type Label = { label: string; tone: TagTone };

export const RESELLER_STATUS: Record<ResellerStatus, Label> = {
  ACTIVE: { label: "Activo", tone: "success" },
  SUSPENDED: { label: "Suspendido", tone: "warning" },
  CLOSED: { label: "Cerrado", tone: "neutral" },
};

export const CODE_STATUS: Record<ReferralCodeStatus, Label> = {
  ACTIVE: { label: "Activo", tone: "success" },
  DISABLED: { label: "Desactivado", tone: "neutral" },
};

export const COMMISSION_STATUS: Record<CommissionStatus, Label> = {
  ACCRUED: { label: "Devengada", tone: "accent" },
  APPROVED: { label: "Aprobada", tone: "success" },
  PAID: { label: "Pagada", tone: "neutral" },
  REVERSED: { label: "Revertida", tone: "danger" },
  HELD: { label: "Retenida", tone: "warning" },
};

export const COMMISSION_KIND: Record<CommissionKind, string> = {
  ACCRUAL: "Comisión",
  REVERSAL: "Reversa",
};

export const PAYOUT_STATUS: Record<PayoutStatus, Label> = {
  DRAFT: { label: "Armada", tone: "accent" },
  EXPORTED: { label: "Exportada", tone: "warning" },
  PAID: { label: "Pagada", tone: "success" },
};

export const ATTRIBUTION_SOURCE: Record<AttributionSource, string> = {
  COOKIE: "Link",
  INVITATION: "Invitación",
  ADMIN: "Corrección",
};

export const SUBSCRIPTION_STATUS: Record<SubscriptionStatus, string> = {
  INCOMPLETE: "Incompleta",
  ACTIVE: "Activa",
  PAST_DUE: "Con deuda",
  SUSPENDED: "Suspendida",
  PAUSED: "Pausada",
  CANCELED: "Cancelada",
};

const PLAN_NAMES: Record<string, string> = {
  DEMO: "Demo",
  STARTER: "Starter",
  BUSINESS: "Business",
  ENTERPRISE: "Enterprise",
};

export function planName(code: string | null): string {
  if (!code) return "Sin plan";
  return PLAN_NAMES[code] ?? code;
}

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
