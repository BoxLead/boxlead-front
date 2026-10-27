export type StatusTone = "neutral" | "accent" | "success" | "warning" | "danger";

export type StatusLabel = { label: string; tone: StatusTone };

export type SubscriptionStatus = "INCOMPLETE" | "ACTIVE" | "PAST_DUE" | "SUSPENDED" | "PAUSED" | "CANCELED";
export type PaymentStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED"
  | "CHARGED_BACK"
  | "IN_MEDIATION"
  | "CANCELLED";
export type RefundStatus = "REQUESTED" | "APPROVED" | "REJECTED";
export type InvoiceStatus = "PENDING" | "ISSUED" | "VOIDED";
export type InvitationStatus = "OPEN" | "ACCEPTED" | "REVOKED" | "EXPIRED";
export type DemoStatus = "ACTIVE" | "ENDED" | "REVOKED";
export type ResellerStatus = "ACTIVE" | "SUSPENDED" | "CLOSED";
export type CodeStatus = "ACTIVE" | "DISABLED";
export type CommissionStatus = "ACCRUED" | "APPROVED" | "PAID" | "REVERSED" | "HELD";
export type PayoutStatus = "DRAFT" | "EXPORTED" | "PAID";
export type FactorStatus = "CONFIRMED" | "PENDING" | "EXPIRED";
export type ConsumerRequestKind = "WITHDRAWAL" | "CANCELLATION";
export type PlanCode = "DEMO" | "STARTER" | "BUSINESS" | "ENTERPRISE";

function status<K extends string>(table: Record<K, [string, StatusTone]>): Record<K, StatusLabel> {
  const out = {} as Record<K, StatusLabel>;
  for (const key of Object.keys(table) as K[]) out[key] = { label: table[key][0], tone: table[key][1] };
  return out;
}

export const SUBSCRIPTION_STATUS = status<SubscriptionStatus>({
  INCOMPLETE: ["Sin pagar", "warning"],
  ACTIVE: ["Activa", "success"],
  PAST_DUE: ["Cuota impaga", "warning"],
  SUSPENDED: ["Suspendida", "danger"],
  PAUSED: ["Pausada", "warning"],
  CANCELED: ["Cancelada", "neutral"],
});

export const PAYMENT_STATUS = status<PaymentStatus>({
  PENDING: ["Pendiente", "warning"],
  APPROVED: ["Aprobado", "success"],
  REJECTED: ["Rechazado", "danger"],
  REFUNDED: ["Reembolsado", "neutral"],
  PARTIALLY_REFUNDED: ["Reembolso parcial", "neutral"],
  CHARGED_BACK: ["Contracargo", "danger"],
  IN_MEDIATION: ["En mediación", "warning"],
  CANCELLED: ["Cancelado", "neutral"],
});

export const REFUND_STATUS = status<RefundStatus>({
  REQUESTED: ["Sin respuesta", "warning"],
  APPROVED: ["Aprobado", "success"],
  REJECTED: ["Rechazado", "danger"],
});

export const INVOICE_STATUS = status<InvoiceStatus>({
  PENDING: ["Para emitir", "warning"],
  ISSUED: ["Emitida", "success"],
  VOIDED: ["Anulada", "neutral"],
});

export const INVITATION_STATUS = status<InvitationStatus>({
  OPEN: ["Abierta", "accent"],
  ACCEPTED: ["Aceptada", "success"],
  REVOKED: ["Revocada", "neutral"],
  EXPIRED: ["Vencida", "warning"],
});

export const DEMO_STATUS = status<DemoStatus>({
  ACTIVE: ["Vigente", "success"],
  ENDED: ["Terminada", "neutral"],
  REVOKED: ["Quitada", "neutral"],
});

export const RESELLER_STATUS = status<ResellerStatus>({
  ACTIVE: ["Activo", "success"],
  SUSPENDED: ["Suspendido", "warning"],
  CLOSED: ["Cerrado", "neutral"],
});

export const CODE_STATUS = status<CodeStatus>({
  ACTIVE: ["Activo", "success"],
  DISABLED: ["Desactivado", "neutral"],
});

export const COMMISSION_STATUS = status<CommissionStatus>({
  ACCRUED: ["Devengada", "accent"],
  APPROVED: ["Aprobada", "success"],
  PAID: ["Pagada", "success"],
  REVERSED: ["Revertida", "danger"],
  HELD: ["Retenida", "warning"],
});

export const PAYOUT_STATUS = status<PayoutStatus>({
  DRAFT: ["Armada", "accent"],
  EXPORTED: ["Exportada", "warning"],
  PAID: ["Pagada", "success"],
});

export const FACTOR_STATUS = status<FactorStatus>({
  CONFIRMED: ["Configurado", "success"],
  PENDING: ["Sin configurar", "warning"],
  EXPIRED: ["Ventana vencida", "danger"],
});

export const REQUEST_KIND = status<ConsumerRequestKind>({
  WITHDRAWAL: ["Arrepentimiento", "warning"],
  CANCELLATION: ["Baja", "neutral"],
});

export const PLAN_LABELS: Record<PlanCode, string> = {
  DEMO: "Demo",
  STARTER: "Starter",
  BUSINESS: "Business",
  ENTERPRISE: "Enterprise",
};

export const NO_PLAN = "Sin plan";
export const NO_SUBSCRIPTION_LABEL = "Sin suscripción";

export function planLabel(code: string | null | undefined): string {
  if (!code) return NO_PLAN;
  return code in PLAN_LABELS ? PLAN_LABELS[code as PlanCode] : code;
}

export function labelsOf<K extends string>(table: Record<K, StatusLabel>): Record<K, string> {
  const out = {} as Record<K, string>;
  for (const key of Object.keys(table) as K[]) out[key] = table[key].label;
  return out;
}

export function tonesOf<K extends string>(table: Record<K, StatusLabel>): Record<K, StatusTone> {
  const out = {} as Record<K, StatusTone>;
  for (const key of Object.keys(table) as K[]) out[key] = table[key].tone;
  return out;
}

export function optionsOf<K extends string>(table: Record<K, StatusLabel | string>): { value: K; label: string }[] {
  return (Object.keys(table) as K[]).map((value) => {
    const entry = table[value];
    return { value, label: typeof entry === "string" ? entry : entry.label };
  });
}
