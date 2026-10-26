import { randomUUID } from "node:crypto";
import type { AdminMe, AdminRole } from "../../admin/src/api/types.ts";
import { failure, ok, type MockReply } from "./http.ts";

export const ADMIN_PASSWORD = "demo1234";
export const VALID_CODE = "123456";
export const SESSION_COOKIE = "boxlead_session";
export const ADMIN_COOKIE = "boxlead_admin";

const MINUTE = 60_000;
const ADMIN_SESSION_MINUTES = 30;
const LOCK_MINUTES = 15;
const MAX_FAILURES = 5;
const ENROLLMENT_HOURS = 24;
const SECRET = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";

export type FactorState = "none" | "pending" | "confirmed";

export type SessionOptions = {
  roles?: AdminRole[];
  factor?: "none" | "confirmed";
  enrollmentOpen?: boolean;
  locked?: boolean;
};

type State = {
  userId: string;
  email: string;
  name: string;
  roles: AdminRole[];
  factor: FactorState;
  enrollmentOpenUntil: string | null;
  failures: number;
  lockedUntil: number;
  adminToken: string | null;
  adminExpiresAt: number;
  sessionToken: string | null;
};

let state = build({});

function build(options: SessionOptions): State {
  const now = Date.now();
  return {
    userId: "0b0e0000-0000-4000-8000-0000000000a1",
    email: "equipo@boxlead.app",
    name: "Equipo BoxLead",
    roles: options.roles ?? ["OWNER"],
    factor: options.factor ?? "confirmed",
    enrollmentOpenUntil: options.enrollmentOpen === false ? null : new Date(now + ENROLLMENT_HOURS * 60 * MINUTE).toISOString(),
    failures: 0,
    lockedUntil: options.locked ? now + LOCK_MINUTES * MINUTE : 0,
    adminToken: null,
    adminExpiresAt: 0,
    sessionToken: null,
  };
}

export function resetSession(options: SessionOptions): void {
  state = build(options);
}

export function expireAdminSession(): void {
  state.adminToken = null;
  state.adminExpiresAt = 0;
}

function cookie(name: string, value: string, maxAge: number, path: string, sameSite: string): string {
  return `${name}=${value}; HttpOnly; SameSite=${sameSite}; Path=${path}; Max-Age=${maxAge}`;
}

export function signedIn(cookies: Map<string, string>): boolean {
  return state.sessionToken !== null && cookies.get(SESSION_COOKIE) === state.sessionToken;
}

export function adminSessionOpen(cookies: Map<string, string>): boolean {
  return state.adminToken !== null && cookies.get(ADMIN_COOKIE) === state.adminToken && state.adminExpiresAt > Date.now();
}

export function identity() {
  return { userId: state.userId, email: state.email, roles: state.roles };
}

function user() {
  return { userId: state.userId, email: state.email, name: state.name };
}

function iso(time: number): string | null {
  return time > Date.now() ? new Date(time).toISOString() : null;
}

function me(cookies: Map<string, string>): AdminMe {
  return {
    userId: state.userId,
    email: state.email,
    roles: state.roles,
    factorConfirmed: state.factor === "confirmed",
    enrollmentOpenUntil: state.factor === "confirmed" ? null : state.enrollmentOpenUntil,
    factorLockedUntil: iso(state.lockedUntil),
    adminSessionExpiresAt: adminSessionOpen(cookies) ? new Date(state.adminExpiresAt).toISOString() : null,
  };
}

function enrollmentOpen(): boolean {
  return state.enrollmentOpenUntil !== null && Date.parse(state.enrollmentOpenUntil) > Date.now();
}

function verify(code: unknown): MockReply | null {
  if (state.lockedUntil > Date.now()) return failure(423, "Too many wrong codes, the factor is locked for a while", "MFA_LOCKED");
  if (typeof code !== "string" || !/^\d{6}$/.test(code)) return failure(400, "Invalid code");
  if (code === VALID_CODE) {
    state.failures = 0;
    return null;
  }
  state.failures += 1;
  if (state.failures >= MAX_FAILURES) {
    state.failures = 0;
    state.lockedUntil = Date.now() + LOCK_MINUTES * MINUTE;
    return failure(423, "Too many wrong codes, the factor is locked for a while", "MFA_LOCKED");
  }
  return failure(401, "The code is not valid", "MFA_INVALID");
}

const ROLE_REQUIRED = failure(403, "This action needs another admin role", "ROLE_REQUIRED");

export function sessionRoute(
  method: string,
  path: string,
  body: Record<string, unknown>,
  cookies: Map<string, string>,
): MockReply | null {
  if (path === "/auth/login" && method === "POST") {
    if (body.password !== ADMIN_PASSWORD) return failure(401, "Invalid email or password");
    state.sessionToken = randomUUID();
    return { status: 200, body: user(), headers: { "Set-Cookie": cookie(SESSION_COOKIE, state.sessionToken, 86400, "/", "Lax") } };
  }
  if (path === "/auth/logout" && method === "POST") {
    state.sessionToken = null;
    return { status: 204, headers: { "Set-Cookie": cookie(SESSION_COOKIE, "", 0, "/", "Lax") } };
  }
  if (path === "/auth/me" && method === "GET") {
    return signedIn(cookies) ? ok(user()) : failure(401, "Unauthorized");
  }
  const isSessionPath =
    path === "/admin/me" || path === "/admin/mfa/enrollment" || path === "/admin/mfa/confirm" || path === "/admin/session";
  if (!isSessionPath) return null;
  if (!signedIn(cookies)) return failure(401, "Unauthorized");
  if (state.roles.length === 0) return ROLE_REQUIRED;

  if (path === "/admin/me" && method === "GET") return ok(me(cookies));
  if (path === "/admin/mfa/enrollment" && method === "POST") {
    if (state.factor === "confirmed" || !enrollmentOpen()) return ROLE_REQUIRED;
    if (state.lockedUntil > Date.now()) return failure(423, "Too many wrong codes, the factor is locked for a while", "MFA_LOCKED");
    state.factor = "pending";
    const label = encodeURIComponent(`BoxLead:${state.email}`);
    return ok({ otpauthUri: `otpauth://totp/${label}?secret=${SECRET}&issuer=BoxLead&algorithm=SHA1&digits=6&period=30` });
  }
  if (path === "/admin/mfa/confirm" && method === "POST") {
    if (state.factor !== "pending" || !enrollmentOpen()) return ROLE_REQUIRED;
    const rejected = verify(body.code);
    if (rejected) return rejected;
    state.factor = "confirmed";
    return { status: 204 };
  }
  if (path === "/admin/session" && method === "POST") {
    if (state.factor !== "confirmed") return ROLE_REQUIRED;
    const rejected = verify(body.code);
    if (rejected) return rejected;
    state.adminToken = randomUUID();
    state.adminExpiresAt = Date.now() + ADMIN_SESSION_MINUTES * MINUTE;
    return {
      status: 200,
      body: { expiresAt: new Date(state.adminExpiresAt).toISOString() },
      headers: { "Set-Cookie": cookie(ADMIN_COOKIE, state.adminToken, ADMIN_SESSION_MINUTES * 60, "/admin", "Strict") },
    };
  }
  if (path === "/admin/session" && method === "DELETE") {
    expireAdminSession();
    return { status: 204, headers: { "Set-Cookie": cookie(ADMIN_COOKIE, "", 0, "/admin", "Strict") } };
  }
  return failure(405, "Method not allowed");
}
