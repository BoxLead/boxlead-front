import type { AdminRole } from "../../admin/src/api/types.ts";
import { ACTION_LABELS, TARGET_LABELS } from "../../admin/src/areas/operations/labels.ts";
import type {
  AuditEvent,
  ConsumerRequest,
  CustomerMatch,
  TeamMember,
  UsageDay,
  UsageGrouping,
  UsageSummaryRow,
  UsageTotals,
} from "../../admin/src/areas/operations/types.ts";
import { failure, hasRole, ok, page, type AdminIdentity, type MockArea, type MockReply, type ResetOptions } from "./http.ts";

export const OPERATIONS_SCENARIO = "operations";

const DAY_MS = 86_400_000;
const MAX_RANGE_DAYS = 366;
const MAX_REASON = 500;
const MAX_RESOLUTION = 1000;
const TIME_ZONE = "America/Argentina/Buenos_Aires";
const GROUPINGS: readonly UsageGrouping[] = ["USER", "DAY", "MODEL"];
const ROLES: readonly AdminRole[] = ["OWNER", "FINANCE", "SUPPORT"];
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function id(group: string, n: number): string {
  return `0b0e0000-0000-4000-8${group}-${String(n).padStart(12, "0")}`;
}

export const DIRECTORY: readonly CustomerMatch[] = [
  { id: id("001", 1), email: "lucia@agencia-norte.example", name: "Lucía Paz", legalName: null, hasPassword: true, createdAt: "2026-08-02T13:00:00Z" },
  { id: id("001", 2), email: "martin@tienda-sur.example", name: "Martín Gil", legalName: null, hasPassword: true, createdAt: "2026-08-20T15:30:00Z" },
  { id: id("001", 3), email: "sofia@estudio-lago.example", name: "Sofía Ríos", legalName: null, hasPassword: false, createdAt: "2026-09-05T12:10:00Z" },
  { id: id("001", 4), email: "pablo@equipo.example", name: "Pablo Sosa", legalName: null, hasPassword: true, createdAt: "2026-07-01T10:00:00Z" },
  { id: id("001", 5), email: "carla@equipo.example", name: "Carla Vera", legalName: null, hasPassword: true, createdAt: "2026-07-10T10:00:00Z" },
  { id: id("001", 6), email: "diego@equipo.example", name: "Diego Luna", legalName: null, hasPassword: true, createdAt: "2026-07-15T10:00:00Z" },
];

type Grant = { id: string; userId: string; role: AdminRole; grantedAt: string; grantedBy: string | null; enrollmentOpenUntil: string | null; revoked: boolean };
type Factor = { confirmed: boolean; enrollmentOpenUntil: string | null; lastAdminSessionAt: string | null };

type State = {
  usage: UsageDay[];
  requests: ConsumerRequest[];
  grants: Grant[];
  factors: Map<string, Factor>;
  audit: AuditEvent[];
  sequence: number;
};

let state: State = empty();

function empty(): State {
  return { usage: [], requests: [], grants: [], factors: new Map(), audit: [], sequence: 0 };
}

function dayOf(time: number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(time));
}

function usageRow(userId: string, day: string, agent: number, model: string, runs: number, input: number, output: number, cost: number | null, now: Date): UsageDay {
  return {
    userId,
    day,
    agentId: id("002", agent),
    model,
    runs,
    inputTokens: input,
    outputTokens: output,
    cacheReadTokens: Math.round(input * 0.4),
    cacheWriteTokens: Math.round(input * 0.1),
    estimatedCostMicros: cost,
    costCurrency: cost === null ? null : "USD",
    priceVersion: cost === null ? null : 1,
    computedAt: now.toISOString(),
  };
}

function fixtures(now: Date): State {
  const time = now.getTime();
  const today = dayOf(time);
  const yesterday = dayOf(time - DAY_MS);
  const before = dayOf(time - 3 * DAY_MS);
  const [lucia, martin, , pablo, carla, diego] = DIRECTORY.map((entry) => entry.id);
  const at = (hours: number) => new Date(time - hours * 3_600_000).toISOString();
  const usage = [
    usageRow(lucia, today, 1, "claude-sonnet-4-5", 42, 182_400, 21_300, 1_284_500, now),
    usageRow(lucia, yesterday, 1, "claude-sonnet-4-5", 37, 160_100, 18_900, 1_102_250, now),
    usageRow(lucia, yesterday, 2, "claude-haiku-4-5", 12, 30_500, 4_100, 61_200, now),
    usageRow(martin, today, 3, "claude-haiku-4-5", 18, 44_800, 6_250, 92_400, now),
    usageRow(martin, before, 3, "claude-haiku-4-5", 9, 21_000, 2_900, null, now),
  ];
  const request = (n: number, fields: Partial<ConsumerRequest> & Pick<ConsumerRequest, "kind" | "email" | "createdAt">): ConsumerRequest => ({
    id: id("003", n),
    code: `BX-${["7KX2M9", "Q4TD8R", "M2PZ6K", "H8WN3C", "R5JV1T"][n - 1]}`,
    userId: null,
    subscriptionId: null,
    details: null,
    status: "RECEIVED",
    resolution: null,
    resolvedBy: null,
    resolvedAt: null,
    receiptSentAt: null,
    refundable: null,
    ...fields,
  });
  const requests = [
    request(1, { kind: "WITHDRAWAL", email: "lucia@agencia-norte.example", userId: lucia, subscriptionId: id("004", 1), details: "Contraté ayer y me arrepentí, no lo voy a usar.", refundable: { amountMinor: 1_890_000, currency: "ARS" }, createdAt: at(30) }),
    request(2, { kind: "CANCELLATION", email: "martin@tienda-sur.example", userId: martin, subscriptionId: id("004", 2), createdAt: at(20) }),
    request(3, { kind: "CANCELLATION", email: "alguien@correo.example", details: "Quiero darme de baja.", createdAt: at(6) }),
    request(4, { kind: "CANCELLATION", email: "ana@kiosco.example", status: "RESOLVED", resolution: "Cancelamos tu suscripción al final del período.", resolvedAt: at(70), receiptSentAt: at(70), createdAt: at(96) }),
    request(5, { kind: "WITHDRAWAL", email: "juan@feria.example", status: "REJECTED", resolution: "El pedido llegó fuera del plazo de diez días.", resolvedAt: at(120), receiptSentAt: at(120), createdAt: at(150) }),
  ];
  const grant = (n: number, userId: string, role: AdminRole, hours: number): Grant => ({
    id: id("005", n),
    userId,
    role,
    grantedAt: at(hours),
    grantedBy: null,
    enrollmentOpenUntil: new Date(Date.parse(at(hours)) + DAY_MS).toISOString(),
    revoked: false,
  });
  const factors = new Map<string, Factor>([
    [pablo, { confirmed: true, enrollmentOpenUntil: null, lastAdminSessionAt: at(3) }],
    [carla, { confirmed: false, enrollmentOpenUntil: new Date(time + 20 * 3_600_000).toISOString(), lastAdminSessionAt: null }],
    [diego, { confirmed: false, enrollmentOpenUntil: null, lastAdminSessionAt: null }],
  ]);
  const audit: AuditEvent[] = [
    {
      id: id("006", 1),
      occurredAt: at(70),
      actorType: "ADMIN",
      actorUserId: pablo,
      action: "CONSUMER_REQUEST_RESOLVED",
      targetType: "CONSUMER_REQUEST",
      targetId: id("003", 4),
      before: { id: id("003", 4), kind: "CANCELLATION", status: "RECEIVED", resolvedAt: null },
      after: { id: id("003", 4), kind: "CANCELLATION", status: "RESOLVED", resolvedAt: at(70) },
      reason: "Pedido de baja confirmado por mail",
      ip: "203.0.113.10",
      requestId: "req-7f3a",
    },
    {
      id: id("006", 2),
      occurredAt: at(30),
      actorType: "SYSTEM",
      actorUserId: null,
      action: "CONSUMER_REQUEST_RECEIVED",
      targetType: "CONSUMER_REQUEST",
      targetId: id("003", 1),
      before: null,
      after: { id: id("003", 1), kind: "WITHDRAWAL", code: "BX-7KX2M9", status: "RECEIVED" },
      reason: null,
      ip: null,
      requestId: "req-91bc",
    },
    {
      id: id("006", 3),
      occurredAt: at(26),
      actorType: "ADMIN",
      actorUserId: pablo,
      action: "SUBSCRIPTION_PAUSED",
      targetType: "SUBSCRIPTION",
      targetId: id("004", 2),
      before: { id: id("004", 2), status: "ACTIVE", cancelAtPeriodEnd: false },
      after: { id: id("004", 2), status: "PAUSED", cancelAtPeriodEnd: false },
      reason: "El cliente pidió pausar el cobro por vacaciones",
      ip: "203.0.113.10",
      requestId: "req-5d21",
    },
  ];
  return {
    usage,
    requests,
    grants: [grant(1, pablo, "FINANCE", 900), grant(2, carla, "SUPPORT", 4), grant(3, diego, "SUPPORT", 72)],
    factors,
    audit,
    sequence: 10,
  };
}

function reset({ scenario, now }: ResetOptions) {
  state = scenario === OPERATIONS_SCENARIO ? fixtures(now) : empty();
}

function nextId(group: string): string {
  state.sequence += 1;
  return id(group, state.sequence);
}

function badRequest(message: string): MockReply {
  return failure(400, message);
}

function isDay(value: string | null): value is string {
  return value !== null && ISO_DAY.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function range(query: URLSearchParams): { from: string; to: string } | MockReply {
  const from = query.get("from");
  const to = query.get("to");
  if (!isDay(from) || !isDay(to)) return badRequest("from and to are required dates");
  const days = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS + 1;
  if (days < 1) return badRequest("The range needs a start date before its end date");
  if (days > MAX_RANGE_DAYS) return badRequest(`The range cannot be longer than ${MAX_RANGE_DAYS} days`);
  return { from, to };
}

function isReply(value: object): value is MockReply {
  return "status" in value;
}

function inRange(rows: readonly UsageDay[], from: string, to: string): UsageDay[] {
  return rows.filter((row) => row.day >= from && row.day <= to);
}

function zero(currency: string | null): UsageTotals {
  return { runs: 0, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, estimatedCostMicros: 0, costCurrency: currency, rowsWithoutCost: 0 };
}

function add(total: UsageTotals, row: UsageDay) {
  total.runs += row.runs;
  total.inputTokens += row.inputTokens;
  total.outputTokens += row.outputTokens;
  total.cacheReadTokens += row.cacheReadTokens;
  total.cacheWriteTokens += row.cacheWriteTokens;
  if (row.estimatedCostMicros === null) total.rowsWithoutCost += 1;
  else total.estimatedCostMicros += row.estimatedCostMicros;
}

function keyOf(row: UsageDay, grouping: UsageGrouping): string {
  if (grouping === "DAY") return row.day;
  if (grouping === "MODEL") return row.model;
  return row.userId;
}

function byCurrency(a: UsageTotals, b: UsageTotals): number {
  if (a.costCurrency === b.costCurrency) return 0;
  if (a.costCurrency === null) return 1;
  if (b.costCurrency === null) return -1;
  return a.costCurrency.localeCompare(b.costCurrency);
}

function summary(query: URLSearchParams): MockReply {
  const window = range(query);
  if (isReply(window)) return window;
  const grouping = (query.get("groupBy") ?? "USER") as UsageGrouping;
  if (!GROUPINGS.includes(grouping)) return badRequest("Unknown groupBy");
  const rows = new Map<string, UsageSummaryRow>();
  const totals = new Map<string, UsageTotals>();
  for (const row of inRange(state.usage, window.from, window.to)) {
    const key = keyOf(row, grouping);
    const bucket = `${key}|${row.costCurrency ?? ""}`;
    if (!rows.has(bucket)) {
      const email = grouping === "USER" ? (DIRECTORY.find((entry) => entry.id === key)?.email ?? null) : null;
      rows.set(bucket, { key, email, ...zero(row.costCurrency) });
    }
    add(rows.get(bucket) as UsageSummaryRow, row);
    const currency = row.costCurrency ?? "";
    if (!totals.has(currency)) totals.set(currency, zero(row.costCurrency));
    add(totals.get(currency) as UsageTotals, row);
  }
  const sorted = [...rows.values()].sort((a, b) =>
    grouping === "DAY" ? a.key.localeCompare(b.key) || byCurrency(a, b) : b.estimatedCostMicros - a.estimatedCostMicros || byCurrency(a, b),
  );
  const reply = page(sorted, query, 100);
  return ok({ ...(reply.body as object), totals: [...totals.values()].sort(byCurrency) });
}

function usage(query: URLSearchParams): MockReply {
  const window = range(query);
  if (isReply(window)) return window;
  const userId = query.get("userId");
  if (userId && !UUID.test(userId)) return badRequest("Invalid userId");
  const rows = inRange(state.usage, window.from, window.to)
    .filter((row) => !userId || row.userId === userId)
    .sort((a, b) => b.day.localeCompare(a.day) || a.userId.localeCompare(b.userId) || a.agentId.localeCompare(b.agentId) || a.model.localeCompare(b.model));
  return page(rows, query, 100);
}

function textOf(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text.length === 0 || text.length > max ? null : text;
}

function record(admin: AdminIdentity, action: string, targetType: string, targetId: string, before: unknown, after: unknown, reason: string) {
  state.audit.unshift({
    id: nextId("006"),
    occurredAt: new Date().toISOString(),
    actorType: "ADMIN",
    actorUserId: admin.userId,
    action,
    targetType,
    targetId,
    before,
    after,
    reason,
    ip: "127.0.0.1",
    requestId: `req-${state.sequence}`,
  });
}

function consumerRequests(query: URLSearchParams): MockReply {
  const status = query.get("status") ?? "RECEIVED";
  if (!["RECEIVED", "RESOLVED", "REJECTED"].includes(status)) return badRequest("Unknown status");
  const rows = state.requests.filter((row) => row.status === status).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return page(rows, query, 50);
}

function resolve(requestId: string, body: Record<string, unknown>, admin: AdminIdentity): MockReply {
  const reason = textOf(body.reason, MAX_REASON);
  const resolution = textOf(body.resolution, MAX_RESOLUTION);
  if (body.status !== "RESOLVED" && body.status !== "REJECTED") return badRequest("A decision resolves or rejects the request");
  if (!reason || !resolution) return badRequest("A decision needs a resolution and a reason");
  const request = state.requests.find((row) => row.id === requestId);
  if (!request) return failure(404, "Consumer request not found");
  if (request.kind === "WITHDRAWAL" && !hasRole(admin, "FINANCE")) return failure(403, "This action needs another admin role", "ROLE_REQUIRED");
  if (request.userId === admin.userId && !admin.roles.includes("OWNER")) return failure(403, "Admins can not operate on their own account", "ADMIN_SELF_OPERATION");
  if (request.status !== "RECEIVED") return failure(409, "The request is already closed");
  const before = { id: request.id, kind: request.kind, status: request.status, resolvedAt: null };
  const now = new Date().toISOString();
  Object.assign(request, { status: body.status, resolution, resolvedBy: admin.userId, resolvedAt: now, receiptSentAt: now, refundable: null });
  record(admin, "CONSUMER_REQUEST_RESOLVED", "CONSUMER_REQUEST", request.id, before, { ...before, status: request.status, resolvedAt: now }, reason);
  return ok(request);
}

function selfGrants(admin: AdminIdentity): Grant[] {
  return admin.roles
    .filter((role) => !state.grants.some((grant) => grant.userId === admin.userId && grant.role === role))
    .map((role) => ({
      id: id("007", ROLES.indexOf(role) + 1),
      userId: admin.userId,
      role,
      grantedAt: "2026-06-01T12:00:00Z",
      grantedBy: null,
      enrollmentOpenUntil: null,
      revoked: false,
    }));
}

function ensureSelf(admin: AdminIdentity) {
  if (state.grants.some((grant) => grant.userId === admin.userId)) return;
  state.grants.unshift(...selfGrants(admin));
  state.factors.set(admin.userId, { confirmed: true, enrollmentOpenUntil: null, lastAdminSessionAt: new Date().toISOString() });
}

function person(userId: string, admin: AdminIdentity): { email: string; name: string | null; hasPassword: boolean } {
  if (userId === admin.userId) return { email: admin.email, name: "Equipo BoxLead", hasPassword: true };
  const entry = DIRECTORY.find((candidate) => candidate.id === userId);
  return { email: entry?.email ?? "sin-email@example.com", name: entry?.name ?? null, hasPassword: entry?.hasPassword ?? true };
}

function members(query: URLSearchParams, admin: AdminIdentity): MockReply {
  ensureSelf(admin);
  const people = new Map<string, TeamMember>();
  for (const grant of state.grants) {
    if (grant.revoked) continue;
    if (!people.has(grant.userId)) {
      const factor = state.factors.get(grant.userId) ?? { confirmed: false, enrollmentOpenUntil: grant.enrollmentOpenUntil, lastAdminSessionAt: null };
      people.set(grant.userId, {
        userId: grant.userId,
        ...person(grant.userId, admin),
        roles: [],
        factorConfirmed: factor.confirmed,
        enrollmentOpenUntil: factor.confirmed ? null : factor.enrollmentOpenUntil,
        lastAdminSessionAt: factor.lastAdminSessionAt,
      });
    }
    people.get(grant.userId)?.roles.push({ grantId: grant.id, role: grant.role, grantedAt: grant.grantedAt, grantedBy: grant.grantedBy });
  }
  return page([...people.values()], query, 50);
}

function snapshot(grant: Grant) {
  return { id: grant.id, userId: grant.userId, role: grant.role, grantedBy: grant.grantedBy, grantedAt: grant.grantedAt, enrollmentOpenUntil: grant.enrollmentOpenUntil, revokedAt: grant.revoked ? new Date().toISOString() : null };
}

function grantRole(body: Record<string, unknown>, admin: AdminIdentity): MockReply {
  ensureSelf(admin);
  const reason = textOf(body.reason, MAX_REASON);
  const userId = typeof body.userId === "string" ? body.userId : "";
  const role = ROLES.find((candidate) => candidate === body.role);
  if (!reason || !role || !UUID.test(userId)) return badRequest("userId, role and reason are required");
  if (userId !== admin.userId && !DIRECTORY.some((entry) => entry.id === userId)) return failure(404, "User not found");
  if (state.grants.some((grant) => !grant.revoked && grant.userId === userId && grant.role === role)) return failure(409, "The user already has that role");
  const now = Date.now();
  const grant: Grant = { id: nextId("005"), userId, role, grantedAt: new Date(now).toISOString(), grantedBy: admin.userId, enrollmentOpenUntil: new Date(now + DAY_MS).toISOString(), revoked: false };
  state.grants.push(grant);
  const factor = state.factors.get(userId);
  if (!factor?.confirmed) state.factors.set(userId, { confirmed: false, enrollmentOpenUntil: grant.enrollmentOpenUntil, lastAdminSessionAt: factor?.lastAdminSessionAt ?? null });
  record(admin, "ADMIN_GRANTED", "ADMIN_GRANT", grant.id, null, snapshot(grant), reason);
  const { id: grantId, grantedAt, enrollmentOpenUntil } = grant;
  return { status: 201, body: { id: grantId, userId, role, grantedAt, enrollmentOpenUntil } };
}

function revokeRole(grantId: string, body: Record<string, unknown>, admin: AdminIdentity): MockReply {
  ensureSelf(admin);
  const reason = textOf(body.reason, MAX_REASON);
  if (!reason) return badRequest("reason is required");
  const grant = state.grants.find((candidate) => candidate.id === grantId && !candidate.revoked);
  if (!grant) return failure(404, "Grant not found");
  if (grant.role === "OWNER" && state.grants.filter((candidate) => !candidate.revoked && candidate.role === "OWNER").length <= 1) {
    return failure(409, "The last owner cannot be revoked");
  }
  grant.revoked = true;
  record(admin, "ADMIN_REVOKED", "ADMIN_GRANT", grant.id, null, snapshot(grant), reason);
  if (!state.grants.some((candidate) => !candidate.revoked && candidate.userId === grant.userId)) state.factors.delete(grant.userId);
  return { status: 204 };
}

function startOf(day: string): number {
  return Date.parse(`${day}T00:00:00-03:00`);
}

function audit(query: URLSearchParams): MockReply {
  const targetType = query.get("targetType");
  const targetId = query.get("targetId");
  const actorUserId = query.get("actorUserId");
  const actions = query.getAll("action");
  const from = query.get("from");
  const to = query.get("to");
  if (targetId && !targetType) return badRequest("A target id needs its target type");
  if (targetType && !(targetType in TARGET_LABELS)) return badRequest("Unknown targetType");
  if (actions.some((action) => !(action in ACTION_LABELS))) return badRequest("Unknown action");
  if (actorUserId && !UUID.test(actorUserId)) return badRequest("Invalid actorUserId");
  if ((from && !isDay(from)) || (to && !isDay(to))) return badRequest("Invalid date");
  if (from && to && from > to) return badRequest("The range needs a start date before its end date");
  const rows = state.audit
    .filter((event) => !targetType || event.targetType === targetType)
    .filter((event) => !targetId || event.targetId === targetId)
    .filter((event) => !actorUserId || event.actorUserId === actorUserId)
    .filter((event) => actions.length === 0 || actions.includes(event.action))
    .filter((event) => !from || Date.parse(event.occurredAt) >= startOf(from))
    .filter((event) => !to || Date.parse(event.occurredAt) < startOf(to) + DAY_MS)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || b.id.localeCompare(a.id));
  return page(rows, query, 100);
}

export const operations: MockArea = {
  reset,
  routes: [
    { method: "GET", pattern: /^\/admin\/usage$/, access: "ANY", handle: ({ query }) => usage(query) },
    { method: "GET", pattern: /^\/admin\/usage\/summary$/, access: "ANY", handle: ({ query }) => summary(query) },
    { method: "GET", pattern: /^\/admin\/consumer-requests$/, access: "ANY", handle: ({ query }) => consumerRequests(query) },
    {
      method: "POST",
      pattern: /^\/admin\/consumer-requests\/([^/]+)\/resolve$/,
      access: ["SUPPORT", "FINANCE"],
      handle: ({ match, body, admin }) => resolve(match[1], body, admin),
    },
    { method: "GET", pattern: /^\/admin\/grants$/, access: ["OWNER"], handle: ({ query, admin }) => members(query, admin) },
    { method: "POST", pattern: /^\/admin\/grants$/, access: ["OWNER"], handle: ({ body, admin }) => grantRole(body, admin) },
    { method: "DELETE", pattern: /^\/admin\/grants\/([^/]+)$/, access: ["OWNER"], handle: ({ match, body, admin }) => revokeRole(match[1], body, admin) },
    { method: "GET", pattern: /^\/admin\/audit$/, access: ["OWNER"], handle: ({ query }) => audit(query) },
  ],
};
