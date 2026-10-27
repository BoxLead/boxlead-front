import { adminApi } from "../../api/client";
import { AdminApiError, isStale } from "../../api/errors";
import type { Money } from "../../api/types";
import type { InvoiceRow, RefundResult } from "./types";

export type SubscriptionAction = "pause" | "resume" | "cancel";

const BILLING_MESSAGES: Record<string, string> = {
  SUBSCRIPTION_NOT_ACTIVE: "La suscripción ya no está en un estado que permita esto. Recargá para ver lo último.",
  PROVIDER_UNAVAILABLE: "Mercado Pago no respondió y no cambió nada. Probá de nuevo en unos minutos.",
};

async function billingCall<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error) {
    if (error instanceof AdminApiError && error.code && error.code in BILLING_MESSAGES) {
      throw new AdminApiError(BILLING_MESSAGES[error.code], error.status, error.code);
    }
    throw error;
  }
}

export function changeSubscription(userId: string, action: SubscriptionAction, reason: string): Promise<void> {
  return billingCall(() => adminApi.post<void>(`/admin/customers/${encodeURIComponent(userId)}/subscription/${action}`, { reason }));
}

export function refundPayment(paymentId: string, amount: Money | null, reason: string): Promise<RefundResult> {
  const body = amount ? { amount, reason } : { reason };
  return billingCall(() => adminApi.post<RefundResult>(`/admin/payments/${encodeURIComponent(paymentId)}/refunds`, body));
}

export function retryRefund(refundId: string, reason: string): Promise<RefundResult> {
  return billingCall(() => adminApi.post<RefundResult>(`/admin/refunds/${encodeURIComponent(refundId)}/retry`, { reason }));
}

export function markInvoiceIssued(invoiceId: string, invoiceNumber: string, issuedAt: string | null, reason: string): Promise<InvoiceRow> {
  const body = issuedAt ? { invoiceNumber, issuedAt, reason } : { invoiceNumber, reason };
  return adminApi.post<InvoiceRow>(`/admin/invoices/${encodeURIComponent(invoiceId)}/issued`, body);
}

export function markInvoiceVoided(invoiceId: string, reason: string): Promise<InvoiceRow> {
  return adminApi.post<InvoiceRow>(`/admin/invoices/${encodeURIComponent(invoiceId)}/voided`, { reason });
}

export function invalidInput(message: string): AdminApiError {
  return new AdminApiError(message, 400, null);
}

export function changedUnderneath(failure: unknown): boolean {
  return isStale(failure) || (failure instanceof AdminApiError && failure.status === 422);
}
