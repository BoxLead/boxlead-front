import { adminApi } from "../../api/client";
import { AdminApiError } from "../../api/errors";
import type { AdminPage } from "../../api/types";
import { MAX_REASON, MIN_REASON } from "../../components/reason";
import type { CreatedInvitation, CustomerMatch, DemoGrant, NewInvitation } from "./types";
import { MAX_DEMO_DAYS } from "./types";

const FIELD_MESSAGES: Record<string, string> = {
  email: "Revisá el email.",
  expiresAt: "Revisá el día de vencimiento.",
  demoDays: `Los días de Demo van de 1 a ${MAX_DEMO_DAYS}.`,
  endsAt: "Revisá el nuevo fin.",
  reason: `El motivo tiene que tener entre ${MIN_REASON} y ${MAX_REASON} caracteres.`,
};

function explained(error: unknown): unknown {
  if (!(error instanceof AdminApiError) || error.status !== 400 || error.fields.length === 0) return error;
  const known = [...new Set(error.fields.map((problem) => FIELD_MESSAGES[problem.field]).filter(Boolean))];
  if (known.length === 0) return error;
  return new AdminApiError(known.join(" "), error.status, error.code, error.fields);
}

async function send<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error) {
    throw explained(error);
  }
}

export function createInvitation(invitation: NewInvitation, reason: string) {
  return send(() => adminApi.post<CreatedInvitation>("/admin/invitations", { ...invitation, reason }));
}

export function revokeInvitation(id: string, reason: string) {
  return send(() => adminApi.post<unknown>(`/admin/invitations/${encodeURIComponent(id)}/revoke`, { reason }));
}

function demoPath(userId: string, action = "") {
  return `/admin/customers/${encodeURIComponent(userId)}/demo${action}`;
}

export function grantDemo(userId: string, demoDays: number | null, reason: string) {
  return send(() => adminApi.post<DemoGrant>(demoPath(userId), { demoDays, reason }));
}

export function extendDemo(userId: string, endsAt: string, reason: string) {
  return send(() => adminApi.post<DemoGrant>(demoPath(userId, "/extend"), { endsAt, reason }));
}

export function revokeDemo(userId: string, reason: string) {
  return send(() => adminApi.post<DemoGrant>(demoPath(userId, "/revoke"), { reason }));
}

export function searchCustomers(query: string, signal?: AbortSignal) {
  return adminApi.get<AdminPage<CustomerMatch>>("/admin/customers", { query: new URLSearchParams({ query }), signal });
}
