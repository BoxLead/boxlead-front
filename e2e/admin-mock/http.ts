import type { AdminRole } from "../../admin/src/api/types.ts";

export type Access = "ANY" | readonly AdminRole[];

export type MockReply = {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
};

export type AdminIdentity = {
  userId: string;
  email: string;
  roles: readonly AdminRole[];
};

export type MockRequest = {
  method: string;
  path: string;
  query: URLSearchParams;
  body: Record<string, unknown>;
  admin: AdminIdentity;
  match: RegExpMatchArray;
};

export type AdminMockRoute = {
  method: "GET" | "POST" | "PUT" | "DELETE";
  pattern: RegExp;
  access: Access;
  handle: (request: MockRequest) => MockReply | null;
};

export type ResetOptions = {
  scenario: string;
  now: Date;
};

export type MockArea = {
  routes: readonly AdminMockRoute[];
  reset?: (options: ResetOptions) => void;
};

export function canAccess(roles: readonly AdminRole[], access: Access): boolean {
  if (roles.includes("OWNER") || access === "ANY") return roles.length > 0;
  return access.some((role) => roles.includes(role));
}

export function ok(body: unknown): MockReply {
  return { status: 200, body };
}

export function failure(status: number, message: string, code?: string): MockReply {
  return { status, body: code ? { error: message, message, code } : { error: message, message } };
}

export function notFound(): MockReply {
  return failure(404, "Not found");
}

export function pageNumber(query: URLSearchParams): number {
  return Math.max(0, Math.floor(Number(query.get("page")) || 0));
}

export function page<T>(items: readonly T[], query: URLSearchParams, size: number): MockReply {
  const current = pageNumber(query);
  return ok({ items: items.slice(current * size, current * size + size), page: current, size, totalItems: items.length });
}

export function hasRole(admin: AdminIdentity, role: AdminRole): boolean {
  return admin.roles.includes("OWNER") || admin.roles.includes(role);
}
