import { adminApi } from "../../api/client";
import type { AdminPage } from "../../api/types";
import type { CreatedInvitation, CustomerMatch, DemoGrant, NewInvitation } from "./types";

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
  return adminApi.post<DemoGrant>(demoPath(userId), { demoDays, reason });
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
