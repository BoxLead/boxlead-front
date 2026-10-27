import type { Money } from "../../admin/src/api/types.ts";
import { dayOf } from "../../admin/src/areas/customers/dates.ts";
import {
  ENTITLEMENT_KEYS,
  PLAN_CODES,
  SUBSCRIPTION_STATUSES,
  type Attribution,
  type CustomerFile,
  type CustomerMatch,
  type DemoGrant,
  type EntitlementKey,
  type Entitlements,
  type Override,
  type Payment,
  type PlanCode,
  type Subscription,
  type SubscriptionStatus,
} from "../../admin/src/areas/customers/types.ts";
import { failure, hasRole, notFound, ok, page, type AdminIdentity, type MockReply, type MockRequest, type MockArea } from "./http.ts";

export const CUSTOMERS_SCENARIO = "customers";
export const RESELLERS = [
  { id: "0d000000-0000-4000-8000-000000000001", displayName: "Agencia Norte" },
  { id: "0d000000-0000-4000-8000-000000000002", displayName: "Estudio Delta" },
] as const;

const DAY = 86_400_000;
const PAGE_SIZE = 20;
const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 200;
const MAX_REASON = 500;
const MAX_DEMO_DAYS = 365;
const DEFAULT_DEMO_DAYS = 14;
const SERVED: readonly SubscriptionStatus[] = ["ACTIVE", "PAST_DUE", "SUSPENDED"];
const NO_SUBSCRIPTION = "NONE";
const NOT_USER_LIMITS: readonly EntitlementKey[] = ["DEMO_DURATION_DAYS"];
const INVALID_REQUEST = "The request has a value that is not valid";

type Limits = Partial<Record<EntitlementKey, number | null>>;

const PLAN_VERSIONS: Record<PlanCode, string> = {
  DEMO: "9a000000-0000-4000-8000-000000000001",
  STARTER: "9a000000-0000-4000-8000-000000000002",
  BUSINESS: "9a000000-0000-4000-8000-000000000003",
  ENTERPRISE: "9a000000-0000-4000-8000-000000000004",
};

const PLAN_LIMITS: Record<PlanCode, Limits> = {
  DEMO: {
    AGENT_REPLIES_PER_PERIOD: 300,
    AGENTS_MAX: 1,
    PLAYGROUND_RUNS_PER_HOUR: 20,
    METRICS_HISTORY_DAYS: 30,
    PUBLIC_COMMENT_REPLIES: 1,
    AUTO_CATEGORIZE: 1,
  },
  STARTER: {
    AGENT_REPLIES_PER_PERIOD: 1000,
    AGENTS_MAX: 3,
    PLAYGROUND_RUNS_PER_HOUR: 60,
    METRICS_HISTORY_DAYS: 90,
    PUBLIC_COMMENT_REPLIES: 0,
    AUTO_CATEGORIZE: 1,
  },
  BUSINESS: {
    AGENT_REPLIES_PER_PERIOD: 5000,
    AGENTS_MAX: 10,
    PLAYGROUND_RUNS_PER_HOUR: 120,
    METRICS_HISTORY_DAYS: 180,
    PUBLIC_COMMENT_REPLIES: 1,
    AUTO_CATEGORIZE: 1,
  },
  ENTERPRISE: {
    AGENT_REPLIES_PER_PERIOD: null,
    AGENTS_MAX: null,
    PLAYGROUND_RUNS_PER_HOUR: 240,
    METRICS_HISTORY_DAYS: 365,
    PUBLIC_COMMENT_REPLIES: 1,
    AUTO_CATEGORIZE: 1,
  },
};

const PRICES: Partial<Record<PlanCode, { price: Money; charge: Money }>> = {
  STARTER: { price: { amountMinor: 6000, currency: "USD" }, charge: { amountMinor: 8700000, currency: "ARS" } },
  BUSINESS: { price: { amountMinor: 20000, currency: "USD" }, charge: { amountMinor: 29000000, currency: "ARS" } },
};

type StoredSubscription = Subscription & { planCode: PlanCode };

type Customer = {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  billingProfile: CustomerFile["billingProfile"];
  subscription: StoredSubscription | null;
  payments: Payment[];
  demos: DemoGrant[];
  attributions: Attribution[];
  overrides: Override[];
  resellerId: string | null;
  replies: number;
};

type StoredRefund = { paymentId: string; amount: Money | null; status: "REQUESTED" | "APPROVED" | "REJECTED"; createdAt: string };

type StoredCommission = { status: "ACCRUED" | "APPROVED" | "PAID" | "REVERSED" | "HELD"; amount: Money; payoutId: string | null; releaseAt: string };

let records: Customer[] = [];
let refunds: StoredRefund[] = [];
let commissions: StoredCommission[] = [];
let providerUpdates = new Map<string, string>();

function uuid(prefix: string, n: number): string {
  return `${prefix}000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

function iso(time: number): string {
  return new Date(time).toISOString();
}

function ars(amountMinor: number): Money {
  return { amountMinor, currency: "ARS" };
}

function subscription(
  n: number,
  planCode: "STARTER" | "BUSINESS",
  status: SubscriptionStatus,
  now: number,
  extra: Partial<Subscription> = {},
): StoredSubscription {
  const prices = PRICES[planCode];
  if (!prices) throw new Error(`No price for ${planCode}`);
  const start = now - 10 * DAY;
  return {
    id: uuid("0e", n),
    planCode,
    status,
    planVersionId: PLAN_VERSIONS[planCode],
    pendingPlanVersionId: null,
    price: prices.price,
    charge: prices.charge,
    lastCheckoutStatus: null,
    providerSubscriptionId: `preapproval-${n}`,
    providerStatus: status === "PAUSED" ? "paused" : status === "CANCELED" ? "cancelled" : "authorized",
    providerNextPaymentAt: status === "CANCELED" ? null : iso(start + 30 * DAY),
    currentPeriodStart: iso(start),
    currentPeriodEnd: iso(start + 30 * DAY),
    paidThrough: iso(start + 30 * DAY),
    graceUntil: null,
    suspendedUntil: null,
    cancelAtPeriodEnd: false,
    disputed: false,
    canceledAt: null,
    cancelReason: null,
    createdAt: iso(now - 95 * DAY),
    ...extra,
  };
}

function payment(n: number, charge: Money, at: number, status: Payment["status"], invoice: Payment["invoice"], refunded = 0): Payment {
  return {
    id: uuid("0f", n),
    providerPaymentId: String(90_000_000 + n),
    status,
    statusDetail: status === "REJECTED" ? "cc_rejected_insufficient_amount" : "accredited",
    amount: charge,
    refunded: { amountMinor: refunded, currency: charge.currency },
    providerFee: status === "REJECTED" ? null : { amountMinor: Math.round(charge.amountMinor * 0.07), currency: charge.currency },
    approvedAt: status === "REJECTED" ? null : iso(at),
    createdAt: iso(at),
    invoice,
  };
}

function invoice(n: number, status: "PENDING" | "ISSUED" | "VOIDED"): Payment["invoice"] {
  return { id: uuid("1a", n), status, invoiceNumber: status === "PENDING" ? null : `0003-${String(n).padStart(8, "0")}` };
}

function person(n: number, email: string, name: string, now: number, days: number): Customer {
  return {
    id: uuid("0c", n),
    email,
    name,
    createdAt: iso(now - days * DAY),
    billingProfile: null,
    subscription: null,
    payments: [],
    demos: [],
    attributions: [],
    overrides: [],
    resellerId: null,
    replies: 0,
  };
}

function seed(now: number): Customer[] {
  const ana = person(1, "ana.gomez@example.com", "Ana Gómez", now, 120);
  ana.billingProfile = { country: "AR", taxIdType: "CUIT", taxId: "27-11111111-4", legalName: "Ana Gómez", vatCondition: "MONOTRIBUTO" };
  ana.subscription = subscription(1, "STARTER", "ACTIVE", now);
  ana.payments = [
    payment(3, ars(8700000), now - 2 * DAY, "APPROVED", invoice(3, "PENDING")),
    payment(2, ars(8700000), now - 32 * DAY, "APPROVED", invoice(2, "ISSUED")),
    payment(1, ars(8700000), now - 62 * DAY, "APPROVED", invoice(1, "ISSUED")),
  ];
  ana.attributions = [
    {
      id: uuid("1b", 1),
      userId: ana.id,
      resellerId: RESELLERS[0].id,
      referralCodeId: uuid("1c", 1),
      source: "COOKIE",
      sequence: 1,
      reason: null,
      createdAt: ana.createdAt,
    },
  ];
  ana.overrides = [
    {
      id: uuid("1d", 1),
      userId: ana.id,
      key: "AGENTS_MAX",
      value: 5,
      expiresAt: null,
      reason: "Pidió dos agentes más para probar Instagram",
      createdBy: "0b0e0000-0000-4000-8000-0000000000a1",
      createdAt: iso(now - 20 * DAY),
      revokedAt: null,
      revokedBy: null,
    },
  ];
  ana.replies = 412;

  const bruno = person(2, "bruno.diaz@example.com", "Bruno Díaz", now, 6);
  bruno.demos = [
    {
      id: uuid("1e", 2),
      userId: bruno.id,
      invitationId: uuid("1f", 2),
      planVersionId: PLAN_VERSIONS.DEMO,
      startsAt: iso(now - 4 * DAY),
      endsAt: iso(now + 10 * DAY),
      revokedAt: null,
    },
  ];
  bruno.replies = 37;

  const carla = person(3, "carla.ruiz@example.com", "Carla Ruiz", now, 70);
  carla.billingProfile = {
    country: "AR",
    taxIdType: "CUIT",
    taxId: "30-22222222-7",
    legalName: "Ruiz Estudio SRL",
    vatCondition: "RESPONSABLE_INSCRIPTO",
  };
  carla.subscription = subscription(3, "BUSINESS", "PAST_DUE", now, { graceUntil: iso(now + 3 * DAY) });
  carla.payments = [
    payment(5, ars(29000000), now - 1 * DAY, "REJECTED", null),
    payment(4, ars(29000000), now - 31 * DAY, "APPROVED", invoice(4, "ISSUED")),
  ];
  carla.replies = 2210;

  const diego = person(4, "diego.fernandez@example.com", "Diego Fernández", now, 50);
  diego.subscription = subscription(4, "STARTER", "PAUSED", now);
  diego.payments = [payment(6, ars(8700000), now - 40 * DAY, "APPROVED", invoice(6, "ISSUED"))];

  const elena = person(5, "elena.sosa@example.com", "Elena Sosa", now, 40);
  elena.demos = [
    {
      id: uuid("1e", 5),
      userId: elena.id,
      invitationId: null,
      planVersionId: PLAN_VERSIONS.DEMO,
      startsAt: iso(now - 19 * DAY),
      endsAt: iso(now - 5 * DAY),
      revokedAt: null,
    },
  ];

  const federico = person(6, "federico.paz@example.com", "Federico Paz", now, 90);
  federico.subscription = subscription(6, "STARTER", "CANCELED", now, { canceledAt: iso(now - 3 * DAY), cancelReason: "USER_CANCELED" });
  federico.payments = [payment(7, ars(8700000), now - 3 * DAY, "PARTIALLY_REFUNDED", invoice(7, "VOIDED"), 4350000)];

  const gabriela = person(7, "gabriela.torres@example.com", "Gabriela Torres", now, 200);
  gabriela.subscription = subscription(7, "BUSINESS", "ACTIVE", now);
  gabriela.payments = [payment(8, ars(29000000), now - 5 * DAY, "APPROVED", invoice(8, "ISSUED"))];
  gabriela.resellerId = RESELLERS[1].id;
  gabriela.attributions = [
    {
      id: uuid("1b", 7),
      userId: gabriela.id,
      resellerId: RESELLERS[0].id,
      referralCodeId: uuid("1c", 1),
      source: "COOKIE",
      sequence: 1,
      reason: null,
      createdAt: gabriela.createdAt,
    },
    {
      id: uuid("1b", 8),
      userId: gabriela.id,
      resellerId: RESELLERS[1].id,
      referralCodeId: null,
      source: "ADMIN",
      sequence: 2,
      reason: "Llegó por el estudio, el link era viejo",
      createdAt: iso(now - 150 * DAY),
    },
  ];
  gabriela.replies = 1800;

  const others = Array.from({ length: 17 }, (_, index) => {
    const n = index + 8;
    return person(n, `cliente${String(n).padStart(2, "0")}@example.com`, `Cliente ${String(n).padStart(2, "0")}`, now, 8 + index * 9);
  });
  return [ana, bruno, carla, diego, elena, federico, gabriela, ...others];
}

function seedRefunds(now: number): StoredRefund[] {
  return [
    { paymentId: uuid("0f", 7), amount: ars(4350000), status: "APPROVED", createdAt: iso(now - 2 * DAY) },
    { paymentId: uuid("0f", 3), amount: ars(1000000), status: "REJECTED", createdAt: iso(now - 1 * DAY) },
  ];
}

function seedCommissions(now: number): StoredCommission[] {
  return [
    { status: "APPROVED", amount: ars(1305000), payoutId: null, releaseAt: iso(now - 20 * DAY) },
    { status: "APPROVED", amount: ars(609000), payoutId: uuid("2a", 1), releaseAt: iso(now - 50 * DAY) },
    { status: "ACCRUED", amount: ars(609000), payoutId: null, releaseAt: iso(now - 1 * DAY) },
    { status: "ACCRUED", amount: ars(300000), payoutId: null, releaseAt: iso(now + 10 * DAY) },
  ];
}

function currentDemo(customer: Customer): DemoGrant | null {
  return customer.demos.find((demo) => demo.revokedAt === null) ?? null;
}

function demoRunning(customer: Customer, now: number): boolean {
  const demo = currentDemo(customer);
  return demo !== null && Date.parse(demo.startsAt) <= now && Date.parse(demo.endsAt) > now;
}

function liveSubscription(customer: Customer): StoredSubscription | null {
  return customer.subscription && customer.subscription.status !== "CANCELED" ? customer.subscription : null;
}

function activeOverrides(customer: Customer, now: number): Override[] {
  return customer.overrides.filter(
    (override) => override.revokedAt === null && (override.expiresAt === null || Date.parse(override.expiresAt) > now),
  );
}

function planOf(customer: Customer, now: number): { code: PlanCode | null; source: Entitlements["plan"]["source"] } {
  const live = liveSubscription(customer);
  if (live && live.status !== "INCOMPLETE") return { code: live.planCode, source: "SUBSCRIPTION" };
  if (demoRunning(customer, now)) return { code: "DEMO", source: "DEMO" };
  return { code: null, source: "NONE" };
}

function entitlementsOf(customer: Customer, now: number): Entitlements {
  const plan = planOf(customer, now);
  const live = liveSubscription(customer);
  const restricted = live !== null && (live.status === "PAUSED" || live.status === "SUSPENDED");
  const limits: Limits = {};
  for (const key of ENTITLEMENT_KEYS) {
    if (NOT_USER_LIMITS.includes(key)) continue;
    limits[key] = plan.code ? (PLAN_LIMITS[plan.code][key] ?? 0) : 0;
  }
  for (const override of activeOverrides(customer, now)) limits[override.key] = override.value;
  const monthStart = new Date(`${dayOf(new Date(now)).slice(0, 7)}-01T00:00:00-03:00`);
  const period =
    plan.source === "SUBSCRIPTION" && live?.currentPeriodStart && live.currentPeriodEnd
      ? { start: live.currentPeriodStart, end: live.currentPeriodEnd }
      : { start: monthStart.toISOString(), end: new Date(monthStart.getTime() + 31 * DAY).toISOString() };
  return {
    enforced: true,
    access: plan.code && !restricted ? "FULL" : "RESTRICTED",
    plan: { code: plan.code, versionId: plan.code ? PLAN_VERSIONS[plan.code] : null, source: plan.source },
    period,
    limits,
    usage: { AGENT_REPLIES: customer.replies },
    computedAt: iso(now),
  };
}

function matchOf(customer: Customer, now: number): CustomerMatch {
  return {
    id: customer.id,
    email: customer.email,
    name: customer.name,
    legalName: customer.billingProfile?.legalName ?? null,
    createdAt: customer.createdAt,
    planCode: planOf(customer, now).code,
    subscriptionStatus: customer.subscription?.status ?? null,
  };
}

function viewOf(stored: StoredSubscription): Subscription {
  const view: Partial<StoredSubscription> = { ...stored };
  delete view.planCode;
  return view as Subscription;
}

function fileOf(customer: Customer, now: number): CustomerFile {
  const attribution = customer.attributions.reduce<Attribution | null>(
    (last, row) => (!last || row.sequence > last.sequence ? row : last),
    null,
  );
  return {
    id: customer.id,
    email: customer.email,
    name: customer.name,
    createdAt: customer.createdAt,
    billingProfile: customer.billingProfile,
    entitlements: entitlementsOf(customer, now),
    overrides: activeOverrides(customer, now),
    subscription: customer.subscription ? viewOf(customer.subscription) : null,
    payments: customer.payments,
    demo: currentDemo(customer),
    attribution,
    resellerId: customer.resellerId,
  };
}

function badRequest(message = "Validation failed"): MockReply {
  return failure(400, message);
}

function listOf(query: URLSearchParams, key: string, allowed: readonly string[]): string[] | null {
  const values = query.getAll(key).filter(Boolean);
  return values.every((value) => allowed.includes(value)) ? values : null;
}

function day(query: URLSearchParams, key: string): string | null | undefined {
  const value = query.get(key);
  if (!value) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

function search(query: URLSearchParams): MockReply {
  const now = new Date().getTime();
  const plans = listOf(query, "plan", PLAN_CODES);
  const statuses = listOf(query, "status", [...SUBSCRIPTION_STATUSES, NO_SUBSCRIPTION]);
  const from = day(query, "createdFrom");
  const to = day(query, "createdTo");
  if (!plans || !statuses || from === undefined || to === undefined || (from && to && from > to)) return badRequest();
  const text = (query.get("query") ?? "").trim().toLowerCase();
  if (query.get("query") !== null && (text.length < MIN_QUERY_LENGTH || text.length > MAX_QUERY_LENGTH)) {
    return badRequest(`A search needs between ${MIN_QUERY_LENGTH} and ${MAX_QUERY_LENGTH} characters`);
  }
  const rows = records
    .map((customer) => matchOf(customer, now))
    .filter((row) => !text || [row.email, row.name ?? "", row.legalName ?? "", row.id].some((value) => value.toLowerCase().includes(text)))
    .filter((row) => plans.length === 0 || (row.planCode !== null && plans.includes(row.planCode)))
    .filter((row) => statuses.length === 0 || statuses.includes(row.subscriptionStatus ?? NO_SUBSCRIPTION))
    .filter((row) => (!from || dayOf(row.createdAt) >= from) && (!to || dayOf(row.createdAt) <= to))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
  return page(rows, query, PAGE_SIZE);
}

function add(totals: Map<string, number>, money: Money, sign = 1) {
  totals.set(money.currency, (totals.get(money.currency) ?? 0) + sign * money.amountMinor);
}

function refundedWhere(inMonth: (at: string | null) => boolean, payments: readonly Payment[]): Map<string, number> {
  const totals = new Map<string, number>();
  const approved = refunds.filter((row) => row.status === "APPROVED" && inMonth(row.createdAt));
  for (const row of approved) if (row.amount) add(totals, row.amount);
  const whole = new Set(approved.filter((row) => row.amount === null).map((row) => row.paymentId));
  for (const row of payments) if (whole.has(row.id)) add(totals, row.amount);
  for (const row of refunds) if (row.amount && row.status !== "REJECTED" && whole.has(row.paymentId)) add(totals, row.amount, -1);
  return totals;
}

function moneyOf(totals: Map<string, number>): Money[] {
  return [...totals.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([currency, amountMinor]) => ({ amountMinor, currency }));
}

function commissionsWhere(matches: (row: StoredCommission) => boolean): Money[] {
  const totals = new Map<string, number>();
  for (const row of commissions.filter(matches)) add(totals, row.amount);
  return moneyOf(totals);
}

function overview(query: URLSearchParams, admin: AdminIdentity): MockReply {
  const now = new Date();
  const month = query.get("month") ?? dayOf(now).slice(0, 7);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return badRequest("Invalid month");
  const inMonth = (at: string | null) => at !== null && dayOf(at).slice(0, 7) === month;
  const endedBy = (at: string) => dayOf(at).slice(0, 7) <= month;
  const subscriptions = records.flatMap((customer) => (customer.subscription ? [customer.subscription] : []));
  const byStatus: Partial<Record<SubscriptionStatus, number>> = {};
  const byPlan: Record<string, number> = {};
  for (const status of SUBSCRIPTION_STATUSES) byStatus[status] = subscriptions.filter((row) => row.status === status).length;
  for (const row of subscriptions.filter((item) => item.status !== "CANCELED")) byPlan[row.planCode] = (byPlan[row.planCode] ?? 0) + 1;
  const payments = records.flatMap((customer) => customer.payments);
  const approved = payments.filter((row) => inMonth(row.approvedAt));
  const finance = hasRole(admin, "FINANCE");
  const gross = new Map<string, number>();
  const fees = new Map<string, number>();
  for (const row of approved) {
    add(gross, row.amount);
    if (row.providerFee) add(fees, row.providerFee);
  }
  const refunded = refundedWhere(inMonth, payments);
  const currencies = [...new Set([...gross.keys(), ...refunded.keys()])].sort();
  const revenue = currencies.map((currency) => {
    const money = (totals: Map<string, number>) => ({ amountMinor: totals.get(currency) ?? 0, currency });
    const row = { gross: money(gross), refunded: money(refunded), providerFees: money(fees) };
    return {
      currency,
      ...row,
      net: { amountMinor: row.gross.amountMinor - row.refunded.amountMinor - row.providerFees.amountMinor, currency },
    };
  });
  const nowTime = now.getTime();
  return ok({
    month,
    users: {
      total: records.filter((row) => endedBy(row.createdAt)).length,
      newInMonth: records.filter((row) => inMonth(row.createdAt)).length,
    },
    subscriptions: { byStatus, byPlan },
    demos: { active: records.filter((row) => demoRunning(row, nowTime)).length },
    payments: {
      approvedInMonth: approved.length,
      rejectedInMonth: payments.filter((row) => row.status === "REJECTED" && inMonth(providerUpdates.get(row.id) ?? row.createdAt)).length,
    },
    revenue: finance ? revenue : null,
    commissions: {
      approvedUnpaid: finance ? commissionsWhere((row) => row.status === "APPROVED" && row.payoutId === null) : null,
      accruedReleasable: finance ? commissionsWhere((row) => row.status === "ACCRUED" && Date.parse(row.releaseAt) <= nowTime) : null,
    },
  });
}

function reasonOf(body: Record<string, unknown>): string | null {
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  return reason && reason.length <= MAX_REASON ? reason : null;
}

type Action = (customer: Customer, reason: string, request: MockRequest) => MockReply;

function action(handle: Action) {
  return (request: MockRequest): MockReply | null => {
    const customer = records.find((row) => row.id === request.match[1]);
    if (!customer) return null;
    if (customer.id === request.admin.userId && !request.admin.roles.includes("OWNER")) {
      return failure(403, "Admins can not operate on their own account", "ADMIN_SELF_OPERATION");
    }
    const reason = reasonOf(request.body);
    if (!reason) return badRequest();
    return handle(customer, reason, request);
  };
}

function futureInstant(value: unknown): string | null | undefined {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || Number.isNaN(Date.parse(value)) || Date.parse(value) <= new Date().getTime()) return undefined;
  return new Date(value).toISOString();
}

const grantDemo: Action = (customer, _reason, { body }) => {
  if (currentDemo(customer)) return failure(409, "The demo was already used", "DEMO_ALREADY_USED");
  const days = body.demoDays ?? DEFAULT_DEMO_DAYS;
  if (typeof days !== "number" || !Number.isInteger(days) || days < 1 || days > MAX_DEMO_DAYS) return badRequest();
  const now = new Date().getTime();
  const grant: DemoGrant = {
    id: uuid("1e", 100 + customer.demos.length + records.indexOf(customer) * 10),
    userId: customer.id,
    invitationId: null,
    planVersionId: PLAN_VERSIONS.DEMO,
    startsAt: iso(now),
    endsAt: iso(now + days * DAY),
    revokedAt: null,
  };
  customer.demos.push(grant);
  return { status: 201, body: grant };
};

const extendDemo: Action = (customer, _reason, { body }) => {
  const demo = currentDemo(customer);
  if (!demo) return notFound();
  const endsAt = futureInstant(body.endsAt);
  if (!endsAt) return badRequest("A demo can only be extended into the future");
  demo.endsAt = endsAt;
  return ok(demo);
};

const revokeDemo: Action = (customer) => {
  const demo = currentDemo(customer);
  if (!demo) return notFound();
  demo.revokedAt = new Date().toISOString();
  return ok(demo);
};

function keyOf(raw: string | undefined): EntitlementKey | null {
  return raw && (ENTITLEMENT_KEYS as readonly string[]).includes(raw) ? (raw as EntitlementKey) : null;
}

function revokeCurrentOverride(customer: Customer, key: EntitlementKey, admin: AdminIdentity): Override | null {
  const current = customer.overrides.find((row) => row.key === key && row.revokedAt === null) ?? null;
  if (current) {
    current.revokedAt = new Date().toISOString();
    current.revokedBy = admin.userId;
  }
  return current;
}

const setOverride: Action = (customer, reason, { body, admin, match }) => {
  const key = keyOf(match[2]);
  if (!key) return badRequest();
  if (NOT_USER_LIMITS.includes(key)) return badRequest(INVALID_REQUEST);
  const unlimited = body.unlimited === true;
  const value = body.value;
  if (unlimited === (value !== undefined && value !== null)) return badRequest("send a value or unlimited, not both");
  if (!unlimited && (typeof value !== "number" || !Number.isInteger(value) || value < 0)) return badRequest();
  const expiresAt = futureInstant(body.expiresAt);
  if (expiresAt === undefined) return badRequest("An override must expire in the future");
  revokeCurrentOverride(customer, key, admin);
  const created: Override = {
    id: uuid("1d", 100 + customer.overrides.length + records.indexOf(customer) * 20),
    userId: customer.id,
    key,
    value: unlimited ? null : (value as number),
    expiresAt,
    reason,
    createdBy: admin.userId,
    createdAt: new Date().toISOString(),
    revokedAt: null,
    revokedBy: null,
  };
  customer.overrides.push(created);
  return ok(created);
};

const revokeOverride: Action = (customer, _reason, { admin, match }) => {
  const key = keyOf(match[2]);
  if (!key) return badRequest();
  const revoked = revokeCurrentOverride(customer, key, admin);
  return revoked ? ok(revoked) : failure(404, "The user has no override for that limit");
};

function transition(next: (subscription: StoredSubscription) => Partial<Subscription> | null): Action {
  return (customer) => {
    const live = liveSubscription(customer);
    if (!live) return failure(404, "The user has no live subscription");
    const change = next(live);
    if (!change) return failure(409, "The subscription is not active", "SUBSCRIPTION_NOT_ACTIVE");
    Object.assign(live, change);
    return { status: 204 };
  };
}

const pause = transition((row) => (SERVED.includes(row.status) ? { status: "PAUSED", providerStatus: "paused" } : null));
const resume = transition((row) => (row.status === "PAUSED" ? { status: "ACTIVE", providerStatus: "authorized" } : null));
const cancel = transition(() => ({
  status: "CANCELED",
  providerStatus: "cancelled",
  providerNextPaymentAt: null,
  canceledAt: new Date().toISOString(),
  cancelReason: "ADMIN_CANCELED",
}));

const correctAttribution: Action = (customer, reason, { body }) => {
  const resellerId = body.resellerId;
  if (typeof resellerId !== "string" || !/^[0-9a-f-]{36}$/.test(resellerId)) return badRequest();
  const current = customer.attributions.reduce<Attribution | null>(
    (last, row) => (!last || row.sequence > last.sequence ? row : last),
    null,
  );
  if (current?.resellerId === resellerId) return failure(409, "The user is already attributed to that reseller");
  const corrected: Attribution = {
    id: uuid("1b", 100 + customer.attributions.length + records.indexOf(customer) * 10),
    userId: customer.id,
    resellerId,
    referralCodeId: null,
    source: "ADMIN",
    sequence: (current?.sequence ?? 0) + 1,
    reason,
    createdAt: new Date().toISOString(),
  };
  customer.attributions.push(corrected);
  return { status: 201, body: corrected };
};

const USER = "([^/]+)";

export const customers: MockArea = {
  routes: [
    { method: "GET", pattern: /^\/admin\/overview$/, access: "ANY", handle: ({ query, admin }) => overview(query, admin) },
    { method: "GET", pattern: /^\/admin\/customers$/, access: "ANY", handle: ({ query }) => search(query) },
    {
      method: "GET",
      pattern: new RegExp(`^/admin/customers/${USER}$`),
      access: "ANY",
      handle: ({ match }) => {
        const customer = records.find((row) => row.id === match[1]);
        return customer ? ok(fileOf(customer, new Date().getTime())) : notFound();
      },
    },
    { method: "POST", pattern: new RegExp(`^/admin/customers/${USER}/demo$`), access: ["SUPPORT"], handle: action(grantDemo) },
    { method: "POST", pattern: new RegExp(`^/admin/customers/${USER}/demo/extend$`), access: ["SUPPORT"], handle: action(extendDemo) },
    { method: "POST", pattern: new RegExp(`^/admin/customers/${USER}/demo/revoke$`), access: ["SUPPORT"], handle: action(revokeDemo) },
    { method: "PUT", pattern: new RegExp(`^/admin/customers/${USER}/overrides/([^/]+)$`), access: ["OWNER"], handle: action(setOverride) },
    {
      method: "DELETE",
      pattern: new RegExp(`^/admin/customers/${USER}/overrides/([^/]+)$`),
      access: ["OWNER"],
      handle: action(revokeOverride),
    },
    { method: "POST", pattern: new RegExp(`^/admin/customers/${USER}/subscription/pause$`), access: ["OWNER"], handle: action(pause) },
    { method: "POST", pattern: new RegExp(`^/admin/customers/${USER}/subscription/resume$`), access: ["OWNER"], handle: action(resume) },
    { method: "POST", pattern: new RegExp(`^/admin/customers/${USER}/subscription/cancel$`), access: ["OWNER"], handle: action(cancel) },
    { method: "POST", pattern: new RegExp(`^/admin/customers/${USER}/attribution$`), access: ["OWNER"], handle: action(correctAttribution) },
  ],
  reset: ({ scenario, now }) => {
    const seeded = scenario === CUSTOMERS_SCENARIO;
    records = seeded ? seed(now.getTime()) : [];
    refunds = seeded ? seedRefunds(now.getTime()) : [];
    commissions = seeded ? seedCommissions(now.getTime()) : [];
    providerUpdates = new Map(seeded ? [[uuid("0f", 5), iso(now.getTime() - 1 * DAY + 2 * 3_600_000)]] : []);
  },
};
