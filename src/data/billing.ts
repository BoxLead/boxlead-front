import { api } from "../api/client";
import type { BillingSummary, Invitation, LegalVersion } from "../api/types";
import { setQueryData } from "./queryCache";

export const BILLING_SUMMARY_KEY = "/billing/summary";
export const CURRENT_INVITATION_KEY = "/invitations/current";
export const LEGAL_DOCUMENTS_KEY = "/legal/documents";
export const BILLING_PATH = "/app/billing";

export function previewInvitation(token: string): Promise<Invitation> {
  return api.post<Invitation>("/invitations/preview", { token });
}

export async function acceptInvitation(): Promise<BillingSummary> {
  const summary = await api.post<BillingSummary>("/invitations/accept");
  setQueryData<BillingSummary>(BILLING_SUMMARY_KEY, () => summary);
  return summary;
}

export function acceptLegal(acceptedLegal: LegalVersion[]): Promise<void> {
  return api.post<void>("/legal/acceptances", { acceptedLegal });
}
