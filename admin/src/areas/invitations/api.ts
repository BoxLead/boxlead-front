import { adminApi } from "../../api/client";
import { AdminApiError } from "../../api/errors";
import type { AdminPage } from "../../api/types";
import type { CreatedInvitation, CustomerMatch, DemoGrant, NewInvitation, ResellerOption } from "./types";

const DEMO_ALREADY_USED = "Ese usuario ya tiene una Demo, aunque haya terminado. Quitala antes de otorgarle otra.";
const RESELLER_PAGES = 10;

function explain(error: unknown): never {
  if (error instanceof AdminApiError && error.code === "DEMO_ALREADY_USED") {
    throw new AdminApiError(DEMO_ALREADY_USED, error.status, error.code);
  }
  throw error;
}

export function createInvitation(invitation: NewInvitation, reason: string) {
  return adminApi.post<CreatedInvitation>("/admin/invitations", { ...invitation, reason });
}

export function revokeInvitation(id: string, reason: string) {
  return adminApi.post<unknown>(`/admin/invitations/${encodeURIComponent(id)}/revoke`, { reason });
}

function demoPath(userId: string, action = "") {
  return `/admin/customers/${encodeURIComponent(userId)}/demo${action}`;
}

export function grantDemo(userId: string, demoDays: number | null, reason: string) {
  return adminApi.post<DemoGrant>(demoPath(userId), { demoDays, reason }).catch(explain);
}

export function extendDemo(userId: string, endsAt: string, reason: string) {
  return adminApi.post<DemoGrant>(demoPath(userId, "/extend"), { endsAt, reason });
}

export function revokeDemo(userId: string, reason: string) {
  return adminApi.post<DemoGrant>(demoPath(userId, "/revoke"), { reason });
}

export function searchCustomers(query: string, signal?: AbortSignal) {
  return adminApi.get<AdminPage<CustomerMatch>>("/admin/customers", { query: new URLSearchParams({ query }), signal });
}

export async function loadResellers(signal?: AbortSignal): Promise<ResellerOption[]> {
  const all: ResellerOption[] = [];
  for (let page = 0; page < RESELLER_PAGES; page += 1) {
    const result = await adminApi.get<AdminPage<ResellerOption>>("/admin/resellers", {
      query: new URLSearchParams({ page: String(page) }),
      signal,
    });
    all.push(...result.items);
    if (result.items.length === 0 || all.length >= result.totalItems) break;
  }
  return all;
}
