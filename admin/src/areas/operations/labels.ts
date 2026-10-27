import { labelsOf, REQUEST_KIND } from "../../status.ts";
import type { AuditActorType, ConsumerRequestKind, ConsumerRequestStatus, UsageGrouping } from "./types";

export const GROUPING_LABELS: Record<UsageGrouping, string> = {
  USER: "Usuario",
  DAY: "Día",
  MODEL: "Modelo",
};

export const KIND_LABELS: Record<ConsumerRequestKind, string> = labelsOf(REQUEST_KIND);

export const REQUEST_STATUS_LABELS: Record<ConsumerRequestStatus, string> = {
  RECEIVED: "Pendientes",
  RESOLVED: "Resueltos",
  REJECTED: "Rechazados",
};

export const ACTOR_LABELS: Record<AuditActorType, string> = {
  USER: "Cliente",
  ADMIN: "Equipo",
  SYSTEM: "Sistema",
  PROVIDER: "Proveedor",
};

export const TARGET_LABELS: Record<string, string> = {
  USER: "Usuario",
  PLAN_VERSION: "Versión de plan",
  ENTITLEMENT_OVERRIDE: "Ajuste de límite",
  DEMO_INVITATION: "Invitación de Demo",
  DEMO_GRANT: "Demo",
  SUBSCRIPTION: "Suscripción",
  PAYMENT: "Pago",
  PAYMENT_DISPUTE: "Disputa",
  REFUND: "Reembolso",
  BILLING_PROFILE: "Datos de facturación",
  INVOICE_RECORD: "Factura",
  RESELLER: "Revendedor",
  REFERRAL_CODE: "Código de referido",
  REFERRAL_ATTRIBUTION: "Atribución",
  COMMISSION_ENTRY: "Comisión",
  RESELLER_PAYOUT: "Liquidación",
  LEGAL_ACCEPTANCE: "Aceptación legal",
  CONSUMER_REQUEST: "Pedido de consumo",
  ADMIN_GRANT: "Rol del equipo",
  ADMIN_MFA_FACTOR: "Factor TOTP",
  ADMIN_SESSION: "Sesión de administración",
};

export const ACTION_LABELS: Record<string, string> = {
  INVITATION_CREATED: "Invitación creada",
  INVITATION_REVOKED: "Invitación revocada",
  INVITATION_ACCEPTED: "Invitación aceptada",
  DEMO_GRANTED: "Demo otorgada",
  DEMO_EXTENDED: "Demo extendida",
  DEMO_REVOKED: "Demo quitada",
  ENTITLEMENT_OVERRIDDEN: "Límite ajustado",
  LEGAL_ACCEPTED: "Textos legales aceptados",
  CONSUMER_REQUEST_RECEIVED: "Pedido de consumo recibido",
  CONSUMER_REQUEST_RESOLVED: "Pedido de consumo cerrado",
  CHECKOUT_STARTED: "Compra iniciada",
  CHECKOUT_REPLACED: "Compra reemplazada",
  BILLING_PROFILE_UPDATED: "Datos de facturación cambiados",
  SUBSCRIPTION_PLAN_CHANGED: "Plan cambiado",
  SUBSCRIPTION_CANCEL_REQUESTED: "Baja pedida por el cliente",
  SUBSCRIPTION_PAUSED: "Suscripción pausada",
  SUBSCRIPTION_RESUMED: "Suscripción reanudada",
  SUBSCRIPTION_CANCELED: "Suscripción cancelada",
  SUBSCRIPTION_TRANSITIONED: "Suscripción cambió de estado",
  PAYMENT_RECORDED: "Pago registrado",
  REFUND_REQUESTED: "Reembolso pedido",
  REFUND_RECORDED: "Reembolso registrado",
  REFUND_RETRIED: "Reembolso reintentado",
  DISPUTE_OPENED: "Disputa abierta",
  DISPUTE_CLOSED: "Disputa cerrada",
  INVOICE_RECORDED: "Factura registrada",
  INVOICE_ISSUED: "Factura emitida",
  INVOICE_VOIDED: "Factura anulada",
  RESELLER_CREATED: "Revendedor creado",
  REFERRAL_CODE_CREATED: "Código creado",
  REFERRAL_CODE_DISABLED: "Código desactivado",
  ATTRIBUTION_CREATED: "Atribución creada",
  ATTRIBUTION_CORRECTED: "Atribución corregida",
  COMMISSION_ACCRUED: "Comisión devengada",
  COMMISSION_APPROVED: "Comisión aprobada",
  COMMISSION_HELD: "Comisión retenida",
  COMMISSION_HELD_BY_DISPUTE: "Comisión retenida por disputa",
  COMMISSION_RELEASED: "Comisión liberada",
  COMMISSION_REVERSED: "Comisión revertida",
  COMMISSION_REVERSAL_CREATED: "Reversa de comisión creada",
  PAYOUT_CREATED: "Liquidación armada",
  PAYOUT_EXPORTED: "Liquidación exportada",
  PAYOUT_PAID: "Liquidación pagada",
  PLAN_VERSION_PUBLISHED: "Versión de plan publicada",
  PLAN_MIGRATION_STARTED: "Migración de plan iniciada",
  ADMIN_BOOTSTRAPPED: "Primer dueño creado",
  ADMIN_GRANTED: "Rol otorgado",
  ADMIN_REVOKED: "Rol quitado",
  ADMIN_MFA_ENROLLED: "Factor configurado",
  ADMIN_MFA_FAILED: "Código incorrecto",
  ADMIN_MFA_RESET: "Factor reiniciado",
  ADMIN_SESSION_OPENED: "Sesión de administración abierta",
  ADMIN_SESSION_CLOSED: "Sesión de administración cerrada",
};

export function labelOf(labels: Record<string, string>, value: string): string {
  return labels[value] ?? value;
}

export function optionsOf(labels: Record<string, string>): { value: string; label: string }[] {
  return Object.entries(labels)
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "es"));
}
