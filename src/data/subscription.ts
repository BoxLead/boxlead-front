import { api, ApiError } from "../api/client";
import type {
  BillingProfile,
  BillingSummary,
  CheckoutResponse,
  LegalDocument,
  LegalVersion,
  PaidPlanCode,
} from "../api/types";
import { isCheckoutUrl } from "../util/checkout";
import { BILLING_SUMMARY_KEY, LEGAL_DOCUMENTS_KEY } from "./billing";
import { invalidateQueries, setQueryData } from "./queryCache";

export const PROFILE_KEY = "/billing/profile";
export const PAYMENTS_KEY = "/billing/payments?page=0";

export class CheckoutUrlError extends Error {
  constructor() {
    super("The checkout URL is not from Mercado Pago");
    this.name = "CheckoutUrlError";
  }
}

function storeSummary(summary: BillingSummary): BillingSummary {
  setQueryData<BillingSummary>(BILLING_SUMMARY_KEY, () => summary);
  return summary;
}

export function fetchSummary(): Promise<BillingSummary> {
  return api.get<BillingSummary>(BILLING_SUMMARY_KEY).then(storeSummary);
}

export async function fetchCheckoutLegal(): Promise<LegalDocument[]> {
  try {
    return await api.get<LegalDocument[]>(LEGAL_DOCUMENTS_KEY);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return [];
    throw error;
  }
}

export async function startCheckout(planCode: PaidPlanCode, payerEmail: string, acceptedLegal: LegalVersion[]): Promise<string> {
  const { checkoutUrl } = await api.post<CheckoutResponse>("/billing/checkout", {
    planCode,
    payerEmail,
    ...(acceptedLegal.length > 0 ? { acceptedLegal } : {}),
  });
  if (!isCheckoutUrl(checkoutUrl)) throw new CheckoutUrlError();
  return checkoutUrl;
}

export async function changePlan(planCode: PaidPlanCode): Promise<BillingSummary> {
  return storeSummary(await api.post<BillingSummary>("/billing/subscription/plan", { planCode }));
}

export async function cancelSubscription(): Promise<BillingSummary> {
  return storeSummary(await api.post<BillingSummary>("/billing/subscription/cancel"));
}

export async function saveProfile(profile: BillingProfile): Promise<BillingProfile> {
  const saved = await api.put<BillingProfile>(PROFILE_KEY, profile);
  setQueryData<BillingProfile>(PROFILE_KEY, () => saved);
  void invalidateQueries(BILLING_SUMMARY_KEY);
  return saved;
}
