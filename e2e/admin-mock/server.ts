import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AdminRole } from "../../admin/src/api/types.ts";
import { billing } from "./billing.ts";
import { customers } from "./customers.ts";
import { canAccess, failure, type MockArea, type MockReply } from "./http.ts";
import { invitations } from "./invitations.ts";
import { operations } from "./operations.ts";
import { referrals } from "./referrals.ts";
import { adminSessionOpen, expireAdminSession, identity, resetSession, sessionRoute, signedIn } from "./session.ts";

const PORT = Number(process.env.MOCK_ADMIN_PORT ?? 8100);
const APP_ORIGIN = process.env.MOCK_APP_ORIGIN ?? "http://localhost:5175";
const SELF = `http://localhost:${PORT}`;
const AREAS: readonly MockArea[] = [customers, billing, invitations, referrals, operations];
const ROLES: readonly AdminRole[] = ["OWNER", "FINANCE", "SUPPORT"];

function send(res: ServerResponse, { status, body, headers }: MockReply) {
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers });
  res.end(body === undefined ? "" : JSON.stringify(body));
}

function readCookies(req: IncomingMessage): Map<string, string> {
  const cookies = new Map<string, string>();
  for (const pair of (req.headers.cookie ?? "").split(/;\s*/)) {
    const index = pair.indexOf("=");
    if (index > 0) cookies.set(pair.slice(0, index), pair.slice(index + 1));
  }
  return cookies;
}

async function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  if (!raw) return {};
  const parsed: unknown = JSON.parse(raw);
  return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
}

function rolesOf(value: unknown): AdminRole[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return ROLES.filter((role) => value.includes(role));
}

function businessRoute(method: string, path: string, url: URL, body: Record<string, unknown>, cookies: Map<string, string>): MockReply {
  if (!signedIn(cookies)) return failure(401, "Unauthorized");
  const admin = identity();
  if (admin.roles.length === 0) return failure(403, "This action needs another admin role", "ROLE_REQUIRED");
  for (const area of AREAS) {
    for (const route of area.routes) {
      const match = route.method === method ? path.match(route.pattern) : null;
      if (!match) continue;
      if (!canAccess(admin.roles, route.access)) return failure(403, "This action needs another admin role", "ROLE_REQUIRED");
      if (!adminSessionOpen(cookies)) return failure(401, "An admin session is required", "ADMIN_SESSION_REQUIRED");
      const reply = route.handle({ method, path, query: url.searchParams, body, admin, match });
      if (reply) return reply;
    }
  }
  return failure(404, "Not found");
}

async function handle(req: IncomingMessage, res: ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", APP_ORIGIN);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Vary", "Origin");
  const method = req.method ?? "GET";
  if (method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept, X-Requested-With");
    return send(res, { status: 200 });
  }

  const url = new URL(req.url ?? "/", SELF);
  const path = url.pathname;
  if (path === "/__health") return send(res, { status: 200, body: { ok: true } });
  if (req.headers["x-requested-with"] !== "boxlead-web") return send(res, failure(403, "Forbidden"));

  const body = await readBody(req);
  if (path === "/__reset" && method === "POST") {
    resetSession({
      roles: rolesOf(body.roles),
      factor: body.factor === "none" ? "none" : "confirmed",
      enrollmentOpen: body.enrollmentOpen !== false,
      locked: body.locked === true,
    });
    const scenario = typeof body.scenario === "string" ? body.scenario : "default";
    for (const area of AREAS) area.reset?.({ scenario, now: new Date() });
    return send(res, { status: 200, body: { scenario } });
  }
  if (path === "/__expire-admin-session" && method === "POST") {
    expireAdminSession();
    return send(res, { status: 204 });
  }

  const cookies = readCookies(req);
  const reply = sessionRoute(method, path, body, cookies);
  if (reply) return send(res, reply);
  if (path.startsWith("/admin/")) return send(res, businessRoute(method, path, url, body, cookies));
  return send(res, failure(404, "Not found"));
}

createServer((req, res) => {
  handle(req, res).catch((error: unknown) => {
    console.error(error);
    if (!res.headersSent) send(res, failure(500, "Internal server error"));
  });
}).listen(PORT, () => {
  console.log(`Admin mock API on ${SELF} for ${APP_ORIGIN}`);
});
