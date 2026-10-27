import { randomBytes, randomUUID } from "node:crypto";
import type { DemoGrant, DemoGrantStatus, Invitation, InvitationStatus } from "../../admin/src/areas/invitations/types.ts";
import { failure, notFound, ok, page, type AdminIdentity, type MockArea, type MockReply, type ResetOptions } from "./http.ts";

const DAY = 86_400_000;
const PAGE_SIZE = 50;
const MOCK_DEMO_DAYS = 14;
const MAX_DEMO_DAYS = 365;
const MAX_EMAIL_LENGTH = 254;
const MIN_REASON = 10;
const MAX_REASON = 500;
const INVALID_REQUEST = "The request has a value that is not valid";
const INVITATION_URL = "http://localhost:5173/invitacion";
const INVITATION_STATUSES: readonly InvitationStatus[] = ["OPEN", "ACCEPTED", "REVOKED", "EXPIRED"];
const DEMO_STATUSES: readonly DemoGrantStatus[] = ["ACTIVE", "ENDED", "REVOKED"];

export const INVITATIONS_SCENARIO = "invitations";
export const INVITATIONS_EMAIL_SCENARIO = "invitations-email";

export const MOCK_USERS = [
  { id: "0b0e0000-0000-4000-8000-000000000101", email: "lucia@estudiofiorito.com", name: "Lucía Fiorito" },
  { id: "0b0e0000-0000-4000-8000-000000000102", email: "martin@ferreteriasur.com", name: "Martín Gómez" },
  { id: "0b0e0000-0000-4000-8000-000000000103", email: "carla@inmobiliariarivas.com", name: "Carla Rivas" },
  { id: "0b0e0000-0000-4000-8000-000000000104", email: "sofia@clinicadental.com", name: "Sofía Pereyra" },
  { id: "0b0e0000-0000-4000-8000-000000000105", email: "diego@agenciadelsur.com", name: "Diego Álvarez" },
] as const;

export const MOCK_SUBSCRIBED = { userId: MOCK_USERS[4].id, planCode: "STARTER", subscriptionStatus: "ACTIVE" } as const;

export const MOCK_RESELLER = { id: "0b0e0000-0000-4000-8000-000000000201", displayName: "Agencia Norte" };

type StoredInvitation = Omit<Invitation, "status">;
type StoredGrant = Omit<DemoGrant, "status" | "email">;

type State = {
  emailEnabled: boolean;
  invitations: StoredInvitation[];
  grants: StoredGrant[];
};

let state: State = { emailEnabled: false, invitations: [], grants: [] };

function at(now: number, days: number): string {
  return new Date(now + days * DAY).toISOString();
}

function seed(now: number): Pick<State, "invitations" | "grants"> {
  const admin = "0b0e0000-0000-4000-8000-0000000000a1";
  const [lucia, martin, carla, sofia] = MOCK_USERS;
  const invitation = (id: string, email: string, created: number, rest: Partial<StoredInvitation>): StoredInvitation => ({
    id,
    email,
    demoDays: MOCK_DEMO_DAYS,
    expiresAt: at(now, created + 7),
    resellerId: null,
    createdBy: admin,
    createdAt: at(now, created),
    acceptedAt: null,
    acceptedUserId: null,
    revokedAt: null,
    ...rest,
  });
  return {
    invitations: [
      invitation("0b0e0000-0000-4000-8000-000000000301", "nora@panaderiadelbarrio.com", -1, { demoDays: 30, resellerId: MOCK_RESELLER.id }),
      invitation("0b0e0000-0000-4000-8000-000000000302", lucia.email, -5, { acceptedAt: at(now, -4), acceptedUserId: lucia.id }),
      invitation("0b0e0000-0000-4000-8000-000000000303", "pablo@talleresunidos.com", -12, {}),
      invitation("0b0e0000-0000-4000-8000-000000000304", "julieta@modaurbana.com", -20, { revokedAt: at(now, -18) }),
    ],
    grants: [
      { id: "0b0e0000-0000-4000-8000-000000000401", userId: lucia.id, invitationId: "0b0e0000-0000-4000-8000-000000000302", startsAt: at(now, -4), endsAt: at(now, 10), revokedAt: null },
      { id: "0b0e0000-0000-4000-8000-000000000402", userId: martin.id, invitationId: null, startsAt: at(now, -16), endsAt: at(now, -2), revokedAt: null },
      { id: "0b0e0000-0000-4000-8000-000000000403", userId: carla.id, invitationId: null, startsAt: at(now, -30), endsAt: at(now, -16), revokedAt: at(now, -20) },
      { id: "0b0e0000-0000-4000-8000-000000000404", userId: sofia.id, invitationId: null, startsAt: at(now, -2), endsAt: at(now, 2), revokedAt: null },
    ],
  };
}

function reset({ scenario, now }: ResetOptions) {
  const seeded = scenario === INVITATIONS_SCENARIO || scenario === INVITATIONS_EMAIL_SCENARIO;
  state = {
    emailEnabled: scenario === INVITATIONS_EMAIL_SCENARIO,
    ...(seeded ? seed(now.getTime()) : { invitations: [], grants: [] }),
  };
}

function invitationStatus(invitation: StoredInvitation, now = Date.now()): InvitationStatus {
  if (invitation.acceptedAt) return "ACCEPTED";
  if (invitation.revokedAt) return "REVOKED";
  return Date.parse(invitation.expiresAt) > now ? "OPEN" : "EXPIRED";
}

function grantStatus(grant: StoredGrant, now = Date.now()): DemoGrantStatus {
  if (grant.revokedAt) return "REVOKED";
  return Date.parse(grant.endsAt) > now ? "ACTIVE" : "ENDED";
}

function emailOf(userId: string): string | null {
  return MOCK_USERS.find((user) => user.id === userId)?.email ?? null;
}

function statuses<T extends string>(query: URLSearchParams, allowed: readonly T[]): T[] | null {
  const values = query.getAll("status").filter(Boolean);
  return values.every((value) => (allowed as readonly string[]).includes(value)) ? (values as T[]) : null;
}

function startOfDay(day: string): number {
  return Date.parse(`${day}T00:00:00-03:00`);
}

type FieldProblem = { field: string; message: string };

function invalid(fields: FieldProblem[]): MockReply | null {
  if (fields.length === 0) return null;
  return { status: 400, body: { error: "Validation failed", message: "Validation failed", fields } };
}

function reasonFields(body: Record<string, unknown>): FieldProblem[] {
  const reason = typeof body.reason === "string" ? body.reason : "";
  if (!reason.trim()) return [{ field: "reason", message: "must not be blank" }];
  if (reason.length < MIN_REASON || reason.length > MAX_REASON) return [{ field: "reason", message: `size must be between ${MIN_REASON} and ${MAX_REASON}` }];
  return [];
}

function demoDaysFields(value: unknown): FieldProblem[] {
  if (value === null || value === undefined) return [];
  if (!Number.isInteger(value) || (value as number) < 1) return [{ field: "demoDays", message: "must be greater than or equal to 1" }];
  if ((value as number) > MAX_DEMO_DAYS) return [{ field: "demoDays", message: `must be less than or equal to ${MAX_DEMO_DAYS}` }];
  return [];
}

function emailFields(value: unknown): FieldProblem[] {
  const email = typeof value === "string" ? value : "";
  if (!email.trim()) return [{ field: "email", message: "must not be blank" }];
  if (email.length > MAX_EMAIL_LENGTH) return [{ field: "email", message: `size must be between 0 and ${MAX_EMAIL_LENGTH}` }];
  if (!/^[^\s@]*@[^\s@]*$/.test(email)) return [{ field: "email", message: "must be a well-formed email address" }];
  return [];
}

function instantFields(field: string, value: unknown): FieldProblem[] {
  return instant(value) === null ? [{ field, message: "must not be null" }] : [];
}

function invalidRequest(): MockReply {
  return failure(400, INVALID_REQUEST);
}

function instant(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : time;
}

function selfOperation(admin: AdminIdentity, matches: boolean): MockReply | null {
  if (!matches || admin.roles.includes("OWNER")) return null;
  return failure(403, "Admins can not operate on their own account", "ADMIN_SELF_OPERATION");
}

function listInvitations(query: URLSearchParams): MockReply {
  const wanted = statuses(query, INVITATION_STATUSES);
  if (!wanted) return failure(400, "Unknown status");
  const prefix = (query.get("email") ?? "").trim().toLowerCase();
  const rows = state.invitations
    .map((invitation) => ({ ...invitation, status: invitationStatus(invitation) }))
    .filter((invitation) => wanted.length === 0 || wanted.includes(invitation.status))
    .filter((invitation) => invitation.email.startsWith(prefix))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return page(rows, query, PAGE_SIZE);
}

function listGrants(query: URLSearchParams): MockReply {
  const wanted = statuses(query, DEMO_STATUSES);
  if (!wanted) return failure(400, "Unknown status");
  const endsBefore = query.get("endsBefore");
  const limit = endsBefore ? startOfDay(endsBefore) : null;
  if (limit !== null && Number.isNaN(limit)) return failure(400, "Invalid date");
  const rows = state.grants
    .map((grant) => ({ ...grant, email: emailOf(grant.userId), status: grantStatus(grant) }))
    .filter((grant) => wanted.length === 0 || wanted.includes(grant.status))
    .filter((grant) => limit === null || Date.parse(grant.endsAt) < limit)
    .sort((a, b) => a.endsAt.localeCompare(b.endsAt));
  return page(rows, query, PAGE_SIZE);
}

function createInvitation(body: Record<string, unknown>, admin: AdminIdentity): MockReply {
  const problems = invalid([
    ...emailFields(body.email),
    ...instantFields("expiresAt", body.expiresAt),
    ...demoDaysFields(body.demoDays),
    ...reasonFields(body),
  ]);
  if (problems) return problems;
  const email = (body.email as string).trim().toLowerCase();
  const expiresAt = instant(body.expiresAt) as number;
  const demoDays = body.demoDays ?? null;
  const resellerId = typeof body.resellerId === "string" ? body.resellerId : null;
  const at = email.indexOf("@");
  if (at < 1 || at === email.length - 1) return failure(400, "An invitation needs a valid email", "INVITATION_EMAIL_INVALID");
  const self = selfOperation(admin, email === admin.email.toLowerCase());
  if (self) return self;
  if (expiresAt <= Date.now()) return failure(400, "An invitation must expire in the future", "INVITATION_EXPIRY_PAST");
  if (resellerId !== null && resellerId !== MOCK_RESELLER.id) {
    return failure(409, "The reseller does not exist or is not active", "INVITATION_RESELLER_INVALID");
  }
  const open = state.invitations.find((invitation) => invitation.email === email && !invitation.acceptedAt && !invitation.revokedAt);
  if (open && invitationStatus(open) === "OPEN") return failure(409, "This email already has an open invitation", "INVITATION_ALREADY_OPEN");
  if (open) open.revokedAt = new Date().toISOString();
  const id = randomUUID();
  state.invitations.push({
    id,
    email,
    demoDays: (demoDays as number | null) ?? MOCK_DEMO_DAYS,
    expiresAt: new Date(expiresAt).toISOString(),
    resellerId,
    createdBy: admin.userId,
    createdAt: new Date().toISOString(),
    acceptedAt: null,
    acceptedUserId: null,
    revokedAt: null,
  });
  const link = state.emailEnabled ? null : `${INVITATION_URL}#${randomBytes(32).toString("base64url")}`;
  return { status: 201, body: { id, link } };
}

function revokeInvitation(id: string, body: Record<string, unknown>, admin: AdminIdentity): MockReply {
  const problems = invalid(reasonFields(body));
  if (problems) return problems;
  const invitation = state.invitations.find((candidate) => candidate.id === id);
  if (!invitation) return notFound();
  const self = selfOperation(admin, invitation.email === admin.email.toLowerCase());
  if (self) return self;
  if (invitation.acceptedAt || invitation.revokedAt) return failure(409, "The invitation is already closed", "INVITATION_CLOSED");
  invitation.revokedAt = new Date().toISOString();
  const { id: invitationId, email, demoDays, expiresAt, resellerId, acceptedAt, acceptedUserId, revokedAt } = invitation;
  return ok({ id: invitationId, email, demoDays, expiresAt, resellerId, acceptedAt, acceptedUserId, revokedAt });
}

function currentGrant(userId: string): StoredGrant | undefined {
  return state.grants.find((grant) => grant.userId === userId && !grant.revokedAt);
}

function grantResponse(grant: StoredGrant) {
  return { ...grant, planVersionId: "0b0e0000-0000-4000-8000-000000000501" };
}

function grantDemo(userId: string, body: Record<string, unknown>, admin: AdminIdentity): MockReply {
  const problems = invalid([...demoDaysFields(body.demoDays), ...reasonFields(body)]);
  if (problems) return problems;
  const self = selfOperation(admin, userId === admin.userId);
  if (self) return self;
  if (!emailOf(userId)) return notFound();
  const days = body.demoDays ?? MOCK_DEMO_DAYS;
  if (currentGrant(userId)) return failure(409, "The user already used a demo", "DEMO_ALREADY_USED");
  if (userId === MOCK_SUBSCRIBED.userId) {
    return failure(409, "The user has a live subscription, a Demo would have no effect", "DEMO_SUBSCRIPTION_ACTIVE");
  }
  const now = Date.now();
  const grant: StoredGrant = { id: randomUUID(), userId, invitationId: null, startsAt: at(now, 0), endsAt: at(now, days as number), revokedAt: null };
  state.grants.push(grant);
  return { status: 201, body: grantResponse(grant) };
}

function extendDemo(userId: string, body: Record<string, unknown>, admin: AdminIdentity): MockReply {
  const problems = invalid([...instantFields("endsAt", body.endsAt), ...reasonFields(body)]);
  if (problems) return problems;
  const endsAt = instant(body.endsAt) as number;
  const self = selfOperation(admin, userId === admin.userId);
  if (self) return self;
  const grant = currentGrant(userId);
  if (!grant) return failure(404, "The user has no demo");
  if (endsAt <= Date.now() || endsAt <= Date.parse(grant.endsAt)) return invalidRequest();
  grant.endsAt = new Date(endsAt).toISOString();
  return ok(grantResponse(grant));
}

function revokeDemo(userId: string, body: Record<string, unknown>, admin: AdminIdentity): MockReply {
  const problems = invalid(reasonFields(body));
  if (problems) return problems;
  const self = selfOperation(admin, userId === admin.userId);
  if (self) return self;
  const grant = currentGrant(userId);
  if (!grant) return failure(404, "The user has no demo");
  grant.revokedAt = new Date().toISOString();
  return ok(grantResponse(grant));
}

export const invitations: MockArea = {
  reset,
  routes: [
    { method: "GET", pattern: /^\/admin\/invitations$/, access: ["SUPPORT"], handle: ({ query }) => listInvitations(query) },
    { method: "GET", pattern: /^\/admin\/demo-grants$/, access: ["SUPPORT"], handle: ({ query }) => listGrants(query) },
    { method: "POST", pattern: /^\/admin\/invitations$/, access: ["SUPPORT"], handle: ({ body, admin }) => createInvitation(body, admin) },
    {
      method: "POST",
      pattern: /^\/admin\/invitations\/([^/]+)\/revoke$/,
      access: ["SUPPORT"],
      handle: ({ match, body, admin }) => revokeInvitation(match[1], body, admin),
    },
    {
      method: "POST",
      pattern: /^\/admin\/customers\/([^/]+)\/demo$/,
      access: ["SUPPORT"],
      handle: ({ match, body, admin }) => grantDemo(match[1], body, admin),
    },
    {
      method: "POST",
      pattern: /^\/admin\/customers\/([^/]+)\/demo\/extend$/,
      access: ["SUPPORT"],
      handle: ({ match, body, admin }) => extendDemo(match[1], body, admin),
    },
    {
      method: "POST",
      pattern: /^\/admin\/customers\/([^/]+)\/demo\/revoke$/,
      access: ["SUPPORT"],
      handle: ({ match, body, admin }) => revokeDemo(match[1], body, admin),
    },
  ],
};
