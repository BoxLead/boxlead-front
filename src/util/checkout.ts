import type { BillingSummary, LegalDocument, LegalVersion, PaidPlanCode } from "../api/types";

export const CHECKOUT_HOST = "www.mercadopago.com.ar";
export const RETURN_POLL_MS = 3_000;
export const RETURN_TIMEOUT_MS = 60_000;
export const CHECKOUT_LEGAL_KINDS = ["TERMS", "PRIVACY", "ADHESION_CONTRACT"] as const;

export type CheckoutOutcome = "approved" | "waiting" | "pending" | "rejected" | "unpaid" | "none";

export function isCheckoutUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  return (
    url.protocol === "https:" &&
    url.hostname === CHECKOUT_HOST &&
    url.port === "" &&
    url.username === "" &&
    url.password === ""
  );
}

export function paidPlanCode(value: string | null | undefined): PaidPlanCode | null {
  return value === "STARTER" || value === "BUSINESS" ? value : null;
}

export function checkoutOutcome(summary: BillingSummary): CheckoutOutcome {
  if (summary.checkout) {
    if (summary.checkout.status === "PENDING") return "pending";
    if (summary.checkout.status === "REJECTED") return "rejected";
    return "waiting";
  }
  const status = summary.subscription?.status;
  if (status === "ACTIVE") return "approved";
  return status === "PAST_DUE" || status === "SUSPENDED" ? "unpaid" : "none";
}

export function isSettled(outcome: CheckoutOutcome): boolean {
  return outcome === "approved" || outcome === "rejected" || outcome === "none";
}

export function checkoutLegal(documents: LegalDocument[]): LegalVersion[] {
  return documents
    .filter((document) => document.requiresAcceptance && CHECKOUT_LEGAL_KINDS.some((kind) => kind === document.kind))
    .map(({ kind, version }) => ({ kind, version }));
}
