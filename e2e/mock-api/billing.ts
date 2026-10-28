import type {
  Access,
  AgentResponse,
  BillingPayment,
  BillingPlan,
  BillingProfile,
  BillingSummary,
  CheckoutStatus,
  CurrentPlan,
  EntitlementKey,
  FieldError,
  LegalDocument,
  LegalDocumentKind,
  LegalVersion,
  Money,
  PaidPlanCode,
  PlanCode,
  PlanLimits,
  ReferralsResponse,
  SessionFlags,
  SubscriptionStatus,
} from "../../src/api/types.ts";
import { ago, nextId, type MockState } from "./fixtures.ts";

export const BILLING_SCENARIOS = [
  "billing-none",
  "billing-demo",
  "billing-active",
  "billing-past-due",
  "billing-suspended",
  "billing-checkout-pending",
  "billing-checkout-rejected",
  "billing-downgrade-pending",
  "billing-invited",
  "billing-team",
  "reseller",
] as const;

export type BillingScenario = (typeof BILLING_SCENARIOS)[number];

export type BillingOptions = {
  pendingLegal?: boolean;
  entitlementsUnavailable?: boolean;
  agentReplies?: number;
  overrides?: PlanLimits;
};

export const INVITE_COOKIE = "boxlead_invite";
export const REF_COOKIE = "boxlead_ref";
export const CHECKOUT_HOST = "www.mercadopago.com.ar";
export const PROVIDER_DOWN_EMAIL = "caido@pagos.test";
export const REFERRAL_CODE = "7KX2M9QH4R";
export const LEGAL_VERSION = "2026-11";
export const INVITATION_TOKENS = {
  valid: "invite-valid",
  otherEmail: "invite-other-email",
  invalid: "invite-expired",
} as const;
export const INVITED_EMAIL = "ana@negocio.com";

const DAY_MINUTES = 24 * 60;
const PAYMENTS_PAGE_SIZE = 20;
const DEMO_DAYS = 14;
const PERIOD_DAYS = 30;
const LIVE_STATUSES: SubscriptionStatus[] = ["ACTIVE", "PAST_DUE", "SUSPENDED", "PAUSED"];
const PLAN_RANK: Record<PaidPlanCode, number> = { STARTER: 1, BUSINESS: 2 };
const PAID_PLANS: PaidPlanCode[] = ["STARTER", "BUSINESS"];
const PROFILE_FIELDS: (keyof BillingProfile)[] = [
  "country",
  "taxIdType",
  "taxId",
  "legalName",
  "vatCondition",
  "addressLine",
  "city",
  "province",
  "postalCode",
  "billingEmail",
];

const ars = (amountMinor: number): Money => ({ amountMinor, currency: "ARS" });
const usd = (amountMinor: number): Money => ({ amountMinor, currency: "USD" });
const FX_RATE = { day: "2026-10-24", source: "BNA_OFICIAL_VENDEDOR", rate: "1450.00" };

const CATALOG: Partial<Record<PlanCode, BillingPlan>> & Record<"DEMO" | PaidPlanCode, BillingPlan> = {
  DEMO: {
    code: "DEMO",
    name: "Beta",
    versionId: "9a000000-0000-4000-8000-000000000001",
    inviteOnly: true,
    price: null,
    frequencyMonths: null,
    priceIncludesVat: null,
    limits: {
      AGENT_REPLIES_PER_PERIOD: 300,
      AGENTS_MAX: 1,
      PLAYGROUND_RUNS_PER_HOUR: 20,
      METRICS_HISTORY_DAYS: 30,
      PUBLIC_COMMENT_REPLIES: 1,
      AUTO_CATEGORIZE: 1,
    },
  },
  STARTER: {
    code: "STARTER",
    name: "Starter",
    versionId: "9a000000-0000-4000-8000-000000000002",
    inviteOnly: false,
    price: usd(6000),
    chargeToday: ars(8700000),
    fxRate: FX_RATE,
    frequencyMonths: 1,
    priceIncludesVat: true,
    priceWithoutNationalTaxes: ars(7190082),
    limits: {
      AGENT_REPLIES_PER_PERIOD: 1000,
      AGENTS_MAX: 3,
      PLAYGROUND_RUNS_PER_HOUR: 60,
      METRICS_HISTORY_DAYS: 90,
      PUBLIC_COMMENT_REPLIES: 0,
      AUTO_CATEGORIZE: 1,
    },
  },
  BUSINESS: {
    code: "BUSINESS",
    name: "Business",
    versionId: "9a000000-0000-4000-8000-000000000003",
    inviteOnly: false,
    price: usd(20000),
    chargeToday: ars(29000000),
    fxRate: FX_RATE,
    frequencyMonths: 1,
    priceIncludesVat: true,
    priceWithoutNationalTaxes: ars(23966942),
    limits: {
      AGENT_REPLIES_PER_PERIOD: 5000,
      AGENTS_MAX: 10,
      PLAYGROUND_RUNS_PER_HOUR: 120,
      METRICS_HISTORY_DAYS: 180,
      PUBLIC_COMMENT_REPLIES: 1,
      AUTO_CATEGORIZE: 1,
    },
  },
};

CATALOG.ENTERPRISE = {
  code: "ENTERPRISE",
  name: "Enterprise",
  versionId: "9a000000-0000-4000-8000-000000000004",
  inviteOnly: false,
  contactOnly: true,
  price: null,
  frequencyMonths: null,
  priceIncludesVat: null,
  limits: {},
};

const chargeOf = (code: PaidPlanCode): Money => CATALOG[code].chargeToday ?? ars(0);

const LEGAL_DOCUMENTS: LegalDocument[] = [
  { kind: "TERMS", version: LEGAL_VERSION, language: "es", url: "/terminos", requiresAcceptance: true },
  { kind: "PRIVACY", version: LEGAL_VERSION, language: "es", url: "/privacidad", requiresAcceptance: true },
  { kind: "ADHESION_CONTRACT", version: LEGAL_VERSION, language: "es", url: "/contratos", requiresAcceptance: true },
];

type StoredSubscription = {
  preapprovalId: string;
  planCode: PaidPlanCode;
  status: SubscriptionStatus;
  payerEmail: string;
  price: Money;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  graceUntil: string | null;
  cancelAtPeriodEnd: boolean;
  pendingPlanCode: PaidPlanCode | null;
  lastUpgradeAt: string | null;
  checkoutStatus: CheckoutStatus | null;
};

type StoredInvitation = {
  token: string;
  email: string;
  expiresAt: string;
  usable: boolean;
};

export type BillingState = {
  billing: boolean;
  referrals: boolean;
  legal: boolean;
  reseller: boolean;
  team: boolean;
  overrides: PlanLimits;
  entitlementsUnavailable: boolean;
  subscription: StoredSubscription | null;
  demo: { endsAt: string } | null;
  demoUsed: boolean;
  profile: BillingProfile | null;
  payments: BillingPayment[];
  agentReplies: number;
  invitations: StoredInvitation[];
  presetInvitation: string | null;
  pendingLegal: LegalVersion[];
  referralData: ReferralsResponse;
  consumerRequests: number;
};

type Json = Record<string, unknown> | unknown[] | null;

export type MockReply = {
  status: number;
  body?: Json;
  headers?: Record<string, string>;
};

export type MockRequest = {
  method: string;
  path: string;
  parts: string[];
  query: URLSearchParams;
  cookies: Map<string, string>;
  authed: boolean;
  userEmail: string;
  readBody: () => Promise<Record<string, unknown>>;
};

export function limitOverrides(value: unknown): PlanLimits | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  const limits: PlanLimits = {};
  for (const [key, item] of Object.entries(value)) {
    if (item === null || typeof item === "number") limits[key as EntitlementKey] = item;
  }
  return limits;
}

export function isBillingScenario(scenario: string): scenario is BillingScenario {
  return BILLING_SCENARIOS.some((item) => item === scenario);
}

function inDays(days: number): string {
  return ago(-days * DAY_MINUTES);
}

function daysAgo(days: number): string {
  return ago(days * DAY_MINUTES);
}

function monthEnd(): string {
  const now = new Date(ago(0));
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
}

function error(status: number, message: string, code?: string, fields?: FieldError[]): MockReply {
  return { status, body: { error: message, message, ...(code ? { code } : {}), ...(fields ? { fields } : {}) } };
}

function ok(body: Json, status = 200): MockReply {
  return { status, body };
}

const NOT_FOUND = error(404, "Not found");

function profile(): BillingProfile {
  return {
    country: "AR",
    taxIdType: "CUIT",
    taxId: "20123456786",
    legalName: "Negocio SRL",
    vatCondition: "RESPONSABLE_INSCRIPTO",
    addressLine: "Av. Siempre Viva 742",
    city: "Rosario",
    province: "Santa Fe",
    postalCode: "2000",
    billingEmail: "pagos@negocio.com",
  };
}

function subscription(planCode: PaidPlanCode, status: SubscriptionStatus): StoredSubscription {
  const price = chargeOf(planCode);
  return {
    preapprovalId: nextId("preappr").replace(/-/g, ""),
    planCode,
    status,
    payerEmail: "pagos@negocio.com",
    price,
    currentPeriodStart: daysAgo(12),
    currentPeriodEnd: inDays(PERIOD_DAYS - 12),
    graceUntil: null,
    cancelAtPeriodEnd: false,
    pendingPlanCode: null,
    lastUpgradeAt: null,
    checkoutStatus: null,
  };
}

function paymentHistory(price: Money, months: number): BillingPayment[] {
  return Array.from({ length: months }, (_, index) => ({
    date: daysAgo(12 + index * PERIOD_DAYS),
    amount: price,
    status: "APPROVED" as const,
    invoiceNumber: `0001-${String(months - index).padStart(8, "0")}`,
  }));
}

function referralData(): ReferralsResponse {
  const commission = ars(185175);
  return {
    codes: [{ code: REFERRAL_CODE, link: `https://api.boxlead.app/r/${REFERRAL_CODE}`, status: "ACTIVE" }],
    stats: { clicksLast30Days: 48, registrations: 6, activeCustomers: 3 },
    customers: [
      { label: "Negocio SRL", cycle: 3, maxCycles: 6, subscriptionStatus: "ACTIVE" },
      { label: "Ferretería Norte", cycle: 6, maxCycles: 6, subscriptionStatus: "ACTIVE" },
      { label: "j***@gmail.com", cycle: 1, maxCycles: 6, subscriptionStatus: "PAST_DUE" },
    ],
    totals: [
      { status: "ACCRUED", amount: ars(370350) },
      { status: "APPROVED", amount: ars(555525) },
      { status: "PAID", amount: ars(1666575) },
    ],
    entries: [
      { date: daysAgo(3), customerLabel: "Negocio SRL", cycle: 3, amount: commission, status: "ACCRUED", releaseAt: inDays(27) },
      { date: daysAgo(5), customerLabel: "j***@gmail.com", cycle: 1, amount: commission, status: "ACCRUED", releaseAt: inDays(25) },
      { date: daysAgo(33), customerLabel: "Negocio SRL", cycle: 2, amount: commission, status: "APPROVED", releaseAt: daysAgo(3) },
      { date: daysAgo(40), customerLabel: "Ferretería Norte", cycle: 6, amount: commission, status: "PAID", releaseAt: daysAgo(10) },
    ],
  };
}

function emptyReferrals(): ReferralsResponse {
  return {
    codes: [],
    stats: { clicksLast30Days: 0, registrations: 0, activeCustomers: 0 },
    customers: [],
    totals: [],
    entries: [],
  };
}

function invitations(): StoredInvitation[] {
  return [
    { token: INVITATION_TOKENS.valid, email: "demo@boxlead.app", expiresAt: inDays(5), usable: true },
    { token: INVITATION_TOKENS.otherEmail, email: INVITED_EMAIL, expiresAt: inDays(5), usable: true },
    { token: INVITATION_TOKENS.invalid, email: "vencida@negocio.com", expiresAt: daysAgo(1), usable: false },
  ];
}

function disabled(): BillingState {
  return {
    billing: false,
    referrals: false,
    legal: false,
    reseller: false,
    team: false,
    overrides: {},
    entitlementsUnavailable: false,
    subscription: null,
    demo: null,
    demoUsed: false,
    profile: null,
    payments: [],
    agentReplies: 0,
    invitations: invitations(),
    presetInvitation: null,
    pendingLegal: [],
    referralData: emptyReferrals(),
    consumerRequests: 0,
  };
}

export function buildBilling(scenario: string, options: BillingOptions = {}): BillingState {
  const state = disabled();
  if (!isBillingScenario(scenario)) return state;
  state.billing = true;
  state.legal = true;
  state.entitlementsUnavailable = options.entitlementsUnavailable === true;
  state.pendingLegal = options.pendingLegal
    ? [
        { kind: "TERMS", version: LEGAL_VERSION },
        { kind: "PRIVACY", version: LEGAL_VERSION },
      ]
    : [];

  if (scenario === "billing-demo") {
    state.demo = { endsAt: inDays(10) };
    state.demoUsed = true;
    state.agentReplies = 40;
  }
  if (scenario === "billing-invited") state.presetInvitation = INVITATION_TOKENS.otherEmail;
  if (scenario === "billing-team") {
    state.team = true;
    state.profile = profile();
    state.subscription = subscription("STARTER", "SUSPENDED");
    state.subscription.currentPeriodStart = daysAgo(PERIOD_DAYS + 9);
    state.subscription.currentPeriodEnd = daysAgo(9);
    state.subscription.graceUntil = daysAgo(2);
    state.payments = paymentHistory(state.subscription.price, 2);
    state.agentReplies = 300;
  }
  if (scenario === "billing-checkout-pending" || scenario === "billing-checkout-rejected") {
    state.profile = profile();
    state.subscription = {
      ...subscription("STARTER", "INCOMPLETE"),
      checkoutStatus: scenario === "billing-checkout-pending" ? "PENDING" : "REJECTED",
    };
  }
  if (
    scenario === "billing-active" ||
    scenario === "billing-past-due" ||
    scenario === "billing-suspended" ||
    scenario === "reseller"
  ) {
    const status: SubscriptionStatus =
      scenario === "billing-past-due" ? "PAST_DUE" : scenario === "billing-suspended" ? "SUSPENDED" : "ACTIVE";
    state.profile = profile();
    state.subscription = subscription("STARTER", status);
    state.payments = paymentHistory(state.subscription.price, 3);
    state.agentReplies = 120;
    if (status === "PAST_DUE") {
      state.subscription.graceUntil = inDays(5);
      state.payments.unshift({ date: daysAgo(1), amount: state.subscription.price, status: "REJECTED", invoiceNumber: null });
    }
    if (status === "SUSPENDED") {
      state.subscription.currentPeriodStart = daysAgo(PERIOD_DAYS + 9);
      state.subscription.currentPeriodEnd = daysAgo(9);
      state.subscription.graceUntil = daysAgo(2);
    }
  }
  if (scenario === "billing-downgrade-pending") {
    state.profile = profile();
    state.subscription = { ...subscription("BUSINESS", "ACTIVE"), pendingPlanCode: "STARTER", price: chargeOf("STARTER") };
    state.payments = paymentHistory(chargeOf("BUSINESS"), 2);
    state.agentReplies = 900;
  }
  if (typeof options.agentReplies === "number") state.agentReplies = options.agentReplies;
  if (options.overrides) state.overrides = options.overrides;
  if (scenario === "reseller") {
    state.referrals = true;
    state.reseller = true;
    state.referralData = referralData();
  }
  return state;
}

export function withPlanAgents(state: MockState): MockState {
  state.agents = state.agents.map((agent) => ({ ...agent, enabled: true }));
  return state;
}

type Entitlements = { access: Access; plan: CurrentPlan | null; limits: PlanLimits };

function liveSubscription(state: BillingState): StoredSubscription | null {
  const sub = state.subscription;
  return sub && LIVE_STATUSES.includes(sub.status) ? sub : null;
}

function demoActive(state: BillingState): boolean {
  return state.demo !== null && Date.parse(state.demo.endsAt) > Date.parse(ago(0));
}

function entitlements(state: BillingState): Entitlements {
  const standing = standingOf(state);
  return { ...standing, limits: { ...standing.limits, ...state.overrides } };
}

function standingOf(state: BillingState): Entitlements {
  if (state.team) {
    return { access: "FULL", plan: { code: "BUSINESS", name: CATALOG.BUSINESS.name, source: "TEAM" }, limits: CATALOG.BUSINESS.limits };
  }
  const sub = liveSubscription(state);
  if (sub) {
    const plan: CurrentPlan = { code: sub.planCode, name: CATALOG[sub.planCode].name, source: "SUBSCRIPTION" };
    const access: Access = sub.status === "ACTIVE" || sub.status === "PAST_DUE" ? "FULL" : "RESTRICTED";
    return { access, plan, limits: access === "FULL" ? CATALOG[sub.planCode].limits : {} };
  }
  if (demoActive(state)) {
    return { access: "FULL", plan: { code: "DEMO", name: CATALOG.DEMO.name, source: "DEMO" }, limits: CATALOG.DEMO.limits };
  }
  return { access: "RESTRICTED", plan: null, limits: { METRICS_HISTORY_DAYS: CATALOG.DEMO.limits.METRICS_HISTORY_DAYS } };
}

function limitOf(limits: PlanLimits, key: EntitlementKey): number {
  const value = limits[key];
  if (value === null) return Number.POSITIVE_INFINITY;
  return value ?? 0;
}

export function sessionFields(state: BillingState): SessionFlags {
  return {
    features: { billing: state.billing, referrals: state.referrals, legal: state.legal },
    access: state.billing ? entitlements(state).access : "FULL",
    isReseller: state.referrals && state.reseller,
    pendingLegal: state.legal ? state.pendingLegal : [],
  };
}

function checkoutUrl(sub: StoredSubscription): string {
  return `https://${CHECKOUT_HOST}/subscriptions/checkout?preapproval_id=${sub.preapprovalId}`;
}

function summary(state: BillingState): BillingSummary {
  const { access, plan, limits } = entitlements(state);
  const sub = state.subscription;
  const live = liveSubscription(state);
  const replyLimit = limits.AGENT_REPLIES_PER_PERIOD;
  return {
    access,
    plan,
    subscription: live
      ? {
          status: live.status,
          price: live.price,
          currentPeriodEnd: live.currentPeriodEnd,
          graceUntil: live.graceUntil,
          cancelAtPeriodEnd: live.cancelAtPeriodEnd,
          pendingPlanCode: live.pendingPlanCode,
          updatePaymentUrl: live.status === "PAST_DUE" || live.status === "SUSPENDED" ? checkoutUrl(live) : null,
        }
      : null,
    demo: !state.team && demoActive(state) ? state.demo : null,
    checkout: sub?.status === "INCOMPLETE" ? { planCode: sub.planCode, status: sub.checkoutStatus ?? "WAITING" } : null,
    usage: {
      agentReplies: { used: state.agentReplies, limit: replyLimit === undefined ? 0 : replyLimit },
      periodEnd: state.team ? monthEnd() : (live?.currentPeriodEnd ?? state.demo?.endsAt ?? inDays(PERIOD_DAYS)),
    },
    limits,
    billingProfileComplete: state.profile !== null,
  };
}

function cookieInvitation(state: BillingState, cookies: Map<string, string>): StoredInvitation | null {
  const token = cookies.get(INVITE_COOKIE) ?? state.presetInvitation;
  const invitation = state.invitations.find((item) => item.token === token);
  return invitation?.usable ? invitation : null;
}

function isPaidPlan(value: unknown): value is PaidPlanCode {
  return PAID_PLANS.some((plan) => plan === value);
}

function isEmail(value: unknown): value is string {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function acceptedVersions(body: Record<string, unknown>): LegalVersion[] | null {
  const accepted = body.acceptedLegal;
  if (accepted === undefined) return [];
  if (!Array.isArray(accepted)) return null;
  const versions: LegalVersion[] = [];
  for (const item of accepted) {
    if (typeof item !== "object" || item === null) return null;
    const { kind, version } = item as Record<string, unknown>;
    if (typeof kind !== "string" || typeof version !== "string") return null;
    versions.push({ kind: kind as LegalDocumentKind, version });
  }
  return versions;
}

export function missingLegal(
  state: BillingState,
  body: Record<string, unknown>,
  kinds: LegalDocumentKind[] = ["TERMS", "PRIVACY"],
): MockReply | null {
  if (!state.legal) return null;
  const accepted = acceptedVersions(body) ?? [];
  const missing = LEGAL_DOCUMENTS.filter((doc) => kinds.includes(doc.kind)).some(
    (doc) => !accepted.some((item) => item.kind === doc.kind && item.version === doc.version),
  );
  return missing ? error(400, "The current legal documents must be accepted", "LEGAL_ACCEPTANCE_REQUIRED") : null;
}

export function startInvitedDemo(state: BillingState, cookies: Map<string, string>, email: string) {
  if (!state.billing) return;
  const invitation = cookieInvitation(state, cookies);
  if (!invitation || invitation.email !== email.trim().toLowerCase() || state.demoUsed) return;
  invitation.usable = false;
  state.demo = { endsAt: inDays(DEMO_DAYS) };
  state.demoUsed = true;
}

function cuitIsValid(value: string): boolean {
  if (!/^\d{11}$/.test(value)) return false;
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const sum = weights.reduce((total, weight, index) => total + weight * Number(value[index]), 0);
  const remainder = 11 - (sum % 11);
  const check = remainder === 11 ? 0 : remainder;
  return check !== 10 && check === Number(value[10]);
}

function parseProfile(body: Record<string, unknown>): BillingProfile | FieldError[] {
  const fields: FieldError[] = [];
  for (const key of PROFILE_FIELDS) {
    const value = body[key];
    if (typeof value !== "string" || !value.trim()) fields.push({ field: key, message: "must not be blank" });
  }
  if (typeof body.country === "string" && body.country.trim() && !/^[A-Z]{2}$/.test(body.country)) {
    fields.push({ field: "country", message: "must be an ISO country code" });
  }
  if (body.taxIdType === "CUIT" && typeof body.taxId === "string" && body.taxId.trim() && !cuitIsValid(body.taxId.replace(/-/g, ""))) {
    fields.push({ field: "taxId", message: "invalid CUIT" });
  }
  if (typeof body.billingEmail === "string" && body.billingEmail.trim() && !isEmail(body.billingEmail)) {
    fields.push({ field: "billingEmail", message: "must be a well-formed email address" });
  }
  if (fields.length > 0) return fields;
  const entries = PROFILE_FIELDS.map((key) => [key, String(body[key]).trim()]);
  const parsed = Object.fromEntries(entries) as BillingProfile;
  return { ...parsed, taxId: parsed.taxIdType === "CUIT" ? parsed.taxId.replace(/-/g, "") : parsed.taxId };
}

function validation(fields: FieldError[]): MockReply {
  return error(400, "Validation failed", undefined, fields);
}

async function checkout(state: BillingState, req: MockRequest): Promise<MockReply> {
  const body = await req.readBody();
  const fields: FieldError[] = [];
  if (!isPaidPlan(body.planCode)) fields.push({ field: "planCode", message: "must be STARTER or BUSINESS" });
  if (!isEmail(body.payerEmail)) fields.push({ field: "payerEmail", message: "must be a well-formed email address" });
  if (fields.length > 0) return validation(fields);
  const planCode = body.planCode as PaidPlanCode;
  const payerEmail = String(body.payerEmail).trim().toLowerCase();
  const legal = missingLegal(state, body, ["TERMS", "PRIVACY", "ADHESION_CONTRACT"]);
  if (legal) return legal;
  if (liveSubscription(state)) return error(409, "There is already a subscription", "SUBSCRIPTION_EXISTS");
  if (!state.profile) return error(422, "The billing profile is incomplete", "BILLING_PROFILE_REQUIRED");
  if (payerEmail === PROVIDER_DOWN_EMAIL) return error(502, "Mercado Pago did not answer", "PROVIDER_UNAVAILABLE");
  const current = state.subscription;
  if (current?.status === "INCOMPLETE" && current.planCode === planCode && current.payerEmail === payerEmail) {
    return ok({ checkoutUrl: checkoutUrl(current) });
  }
  const created: StoredSubscription = {
    ...subscription(planCode, "INCOMPLETE"),
    payerEmail,
    currentPeriodStart: ago(0),
    currentPeriodEnd: inDays(PERIOD_DAYS),
    checkoutStatus: "WAITING",
  };
  state.subscription = created;
  return ok({ checkoutUrl: checkoutUrl(created) });
}

async function changePlan(state: BillingState, req: MockRequest): Promise<MockReply> {
  const body = await req.readBody();
  if (!isPaidPlan(body.planCode)) return validation([{ field: "planCode", message: "must be STARTER or BUSINESS" }]);
  const planCode = body.planCode;
  const sub = state.subscription;
  if (!sub || sub.status !== "ACTIVE") return error(409, "The subscription is not active", "SUBSCRIPTION_NOT_ACTIVE");
  if (sub.cancelAtPeriodEnd) return error(409, "The subscription is being canceled", "SUBSCRIPTION_CANCELING");
  const priceOf = chargeOf;
  if (planCode === sub.planCode) {
    if (!sub.pendingPlanCode) return error(409, "That is already the current plan", "SAME_PLAN");
    sub.pendingPlanCode = null;
    sub.price = priceOf(sub.planCode);
    return ok(summary(state));
  }
  const upgradedThisPeriod = sub.lastUpgradeAt !== null && sub.lastUpgradeAt >= sub.currentPeriodStart;
  if (PLAN_RANK[planCode] > PLAN_RANK[sub.planCode] || upgradedThisPeriod) {
    if (PLAN_RANK[planCode] > PLAN_RANK[sub.planCode]) sub.lastUpgradeAt = ago(0);
    sub.planCode = planCode;
    sub.pendingPlanCode = null;
    sub.price = priceOf(planCode);
    return ok(summary(state));
  }
  sub.pendingPlanCode = planCode;
  sub.price = priceOf(planCode);
  return ok(summary(state));
}

function cancel(state: BillingState): MockReply {
  const sub = state.subscription;
  if (!sub || (sub.status !== "ACTIVE" && sub.status !== "PAST_DUE")) {
    return error(409, "The subscription is not active", "SUBSCRIPTION_NOT_ACTIVE");
  }
  if (sub.cancelAtPeriodEnd) return error(409, "The subscription is being canceled", "SUBSCRIPTION_CANCELING");
  sub.cancelAtPeriodEnd = true;
  sub.pendingPlanCode = null;
  return ok(summary(state));
}

function acceptInvitation(state: BillingState, req: MockRequest): MockReply {
  const invitation = cookieInvitation(state, req.cookies);
  if (!invitation) return error(410, "The invitation is not valid", "INVITATION_INVALID");
  if (invitation.email !== req.userEmail.toLowerCase()) {
    return error(403, "The invitation belongs to another email", "INVITATION_EMAIL_MISMATCH");
  }
  if (state.demoUsed) return error(409, "The demo was already used", "DEMO_ALREADY_USED");
  invitation.usable = false;
  state.demo = { endsAt: inDays(DEMO_DAYS) };
  state.demoUsed = true;
  return ok(summary(state));
}

async function legalAcceptances(state: BillingState, req: MockRequest): Promise<MockReply> {
  const accepted = acceptedVersions(await req.readBody());
  if (!accepted || accepted.length === 0) return validation([{ field: "acceptedLegal", message: "must not be empty" }]);
  state.pendingLegal = state.pendingLegal.filter(
    (pending) => !accepted.some((item) => item.kind === pending.kind && item.version === pending.version),
  );
  return { status: 204 };
}

async function consumerRequest(state: BillingState, req: MockRequest): Promise<MockReply> {
  const body = await req.readBody();
  const fields: FieldError[] = [];
  if (body.kind !== "WITHDRAWAL" && body.kind !== "CANCELLATION") {
    fields.push({ field: "kind", message: "must be WITHDRAWAL or CANCELLATION" });
  }
  if (!isEmail(body.email)) fields.push({ field: "email", message: "must be a well-formed email address" });
  if (body.details !== undefined && typeof body.details !== "string") fields.push({ field: "details", message: "must be text" });
  if (fields.length > 0) return validation(fields);
  state.consumerRequests += 1;
  const code = `BX-${(36 ** 5 + state.consumerRequests * 7919).toString(36).toUpperCase()}`;
  return ok({ code, createdAt: ago(0) }, 202);
}

function referralRedirect(state: BillingState, req: MockRequest): MockReply {
  const headers: Record<string, string> = { Location: "https://boxlead.app/" };
  const code = (req.parts[1] ?? "").toUpperCase();
  const active = state.referralData.codes.some((item) => item.code === code && item.status === "ACTIVE");
  if (state.referrals && active && !req.cookies.has(REF_COOKIE)) {
    headers["Set-Cookie"] = `${REF_COOKIE}=${code}; SameSite=Lax; Path=/`;
  }
  return { status: 302, headers };
}

export async function billingRoute(state: BillingState, req: MockRequest): Promise<MockReply | null> {
  const { method, parts } = req;
  const [root, second] = parts;

  if (root === "r" && parts.length === 2 && method === "GET") return referralRedirect(state, req);

  if (root === "billing" && second === "plans" && parts.length === 2 && method === "GET") {
    if (!state.billing) return NOT_FOUND;
    return ok([CATALOG.STARTER, CATALOG.BUSINESS, CATALOG.ENTERPRISE, CATALOG.DEMO]);
  }

  if (root === "invitations" && second === "current" && parts.length === 2 && method === "GET") {
    if (!state.billing) return NOT_FOUND;
    const invitation = cookieInvitation(state, req.cookies);
    return invitation ? ok({ email: invitation.email, expiresAt: invitation.expiresAt }) : NOT_FOUND;
  }

  if (root === "invitations" && second === "preview" && parts.length === 2 && method === "POST") {
    if (!state.billing) return NOT_FOUND;
    const { token } = await req.readBody();
    const invitation = state.invitations.find((item) => item.token === token && item.usable);
    if (!invitation) return error(410, "The invitation is not valid", "INVITATION_INVALID");
    return {
      status: 200,
      body: { email: invitation.email, expiresAt: invitation.expiresAt },
      headers: { "Set-Cookie": `${INVITE_COOKIE}=${invitation.token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=3600` },
    };
  }

  if (root === "legal" && second === "documents" && parts.length === 2 && method === "GET") {
    return state.legal ? ok(LEGAL_DOCUMENTS) : NOT_FOUND;
  }

  if (root === "consumer-requests" && parts.length === 1 && method === "POST") {
    return state.legal ? consumerRequest(state, req) : NOT_FOUND;
  }

  const ownsPath =
    root === "billing" ||
    (root === "invitations" && second === "accept") ||
    (root === "referrals" && second === "me") ||
    (root === "legal" && second === "acceptances");
  if (!ownsPath) return null;
  if (!req.authed) return error(401, "Unauthorized");

  if (root === "legal") {
    if (!state.legal) return NOT_FOUND;
    return method === "POST" && parts.length === 2 ? legalAcceptances(state, req) : NOT_FOUND;
  }

  if (root === "referrals") {
    if (!state.referrals || !state.reseller) return NOT_FOUND;
    return method === "GET" && parts.length === 2 ? ok(state.referralData) : NOT_FOUND;
  }

  if (!state.billing) return NOT_FOUND;

  if (root === "invitations") return method === "POST" && parts.length === 2 ? acceptInvitation(state, req) : NOT_FOUND;

  const path = parts.slice(1).join("/");
  if (path === "summary" && method === "GET") return ok(summary(state));
  if (path === "checkout" && method === "POST") return checkout(state, req);
  if (path === "subscription/plan" && method === "POST") return changePlan(state, req);
  if (path === "subscription/cancel" && method === "POST") return cancel(state);
  if (path === "payments" && method === "GET") {
    const page = Math.max(0, Number.parseInt(req.query.get("page") ?? "0", 10) || 0);
    return ok(state.payments.slice(page * PAYMENTS_PAGE_SIZE, (page + 1) * PAYMENTS_PAGE_SIZE));
  }
  if (path === "profile" && method === "GET") return state.profile ? ok(state.profile) : NOT_FOUND;
  if (path === "profile" && method === "PUT") {
    const parsed = parseProfile(await req.readBody());
    if (Array.isArray(parsed)) return validation(parsed);
    state.profile = parsed;
    return ok(parsed);
  }
  return NOT_FOUND;
}

export function settleCheckout(state: BillingState, status: unknown): MockReply {
  const sub = state.subscription;
  if (!sub || sub.status !== "INCOMPLETE") return error(409, "There is no checkout in progress");
  if (status === "APPROVED") {
    sub.status = "ACTIVE";
    sub.checkoutStatus = null;
    sub.currentPeriodStart = ago(0);
    sub.currentPeriodEnd = inDays(PERIOD_DAYS);
    state.payments.unshift({
      date: ago(0),
      amount: sub.price,
      status: "APPROVED",
      invoiceNumber: `0001-${String(state.payments.length + 1).padStart(8, "0")}`,
    });
    return ok(summary(state));
  }
  if (status === "PENDING" || status === "REJECTED") {
    sub.checkoutStatus = status;
    return ok(summary(state));
  }
  return error(400, "Unknown checkout status");
}

type AgentAction = "create" | "enable" | "playground";

export function agentGate(state: BillingState, action: AgentAction, agents: AgentResponse[]): MockReply | null {
  if (!state.billing) return null;
  if (state.entitlementsUnavailable) {
    return error(503, "Entitlements are unavailable, try again in a while", "ENTITLEMENTS_UNAVAILABLE");
  }
  const { access, limits } = entitlements(state);
  if (access === "RESTRICTED") return error(402, "A plan is required", "PLAN_REQUIRED");
  if (action === "playground") return null;
  const max = limitOf(limits, "AGENTS_MAX");
  const count = action === "create" ? agents.length : agents.filter((agent) => agent.enabled).length;
  return count >= max ? error(402, "The plan limit was reached", "PLAN_LIMIT_REACHED") : null;
}

export function playgroundLimit(state: BillingState): number {
  if (!state.billing) return Number.POSITIVE_INFINITY;
  return limitOf(entitlements(state).limits, "PLAYGROUND_RUNS_PER_HOUR");
}

export function markOverPlanLimit(state: BillingState, agents: AgentResponse[]): AgentResponse[] {
  const sorted = [...agents].sort((a, b) => a.position - b.position);
  if (!state.billing) return sorted;
  const { access, limits } = entitlements(state);
  if (access !== "FULL") return sorted;
  const max = limitOf(limits, "AGENTS_MAX");
  let running = 0;
  return sorted.map((agent) => {
    if (!agent.enabled) return agent;
    running += 1;
    return running > max ? { ...agent, overPlanLimit: true } : agent;
  });
}

export function manualSendGate(state: BillingState): MockReply | null {
  if (!state.billing) return null;
  return entitlements(state).access === "RESTRICTED" ? error(402, "A plan is required", "PLAN_REQUIRED") : null;
}

export function metricsGate(state: BillingState, from: string | null): MockReply | null {
  if (!state.billing || !from) return null;
  const days = entitlements(state).limits.METRICS_HISTORY_DAYS;
  if (days === undefined || days === null) return null;
  const earliest = ago(days * DAY_MINUTES).slice(0, 10);
  return from.slice(0, 10) < earliest ? error(402, "The plan does not cover that period", "PLAN_LIMIT_REACHED") : null;
}
