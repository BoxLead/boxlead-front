import type { Money } from "../../api/types";

export const PLAN_CODES = ["DEMO", "STARTER", "BUSINESS", "ENTERPRISE"] as const;
export type PlanCode = (typeof PLAN_CODES)[number];

export const SUBSCRIPTION_STATUSES = ["INCOMPLETE", "ACTIVE", "PAST_DUE", "SUSPENDED", "PAUSED", "CANCELED"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const ENTITLEMENT_KEYS = [
  "AGENT_REPLIES_PER_PERIOD",
  "AGENTS_MAX",
  "PLAYGROUND_RUNS_PER_HOUR",
  "LLM_COST_CAP_MICROS",
  "METRICS_HISTORY_DAYS",
  "PUBLIC_COMMENT_REPLIES",
  "AUTO_CATEGORIZE",
  "DEMO_DURATION_DAYS",
] as const;
export type EntitlementKey = (typeof ENTITLEMENT_KEYS)[number];

export type PaymentStatus =
  "PENDING" | "APPROVED" | "REJECTED" | "REFUNDED" | "PARTIALLY_REFUNDED" | "CHARGED_BACK" | "IN_MEDIATION" | "CANCELLED";

export type InvoiceStatus = "PENDING" | "ISSUED" | "VOIDED";
export type CheckoutStatus = "WAITING" | "PENDING" | "REJECTED";
export type AttributionSource = "COOKIE" | "INVITATION" | "ADMIN";
export type PlanSource = "SUBSCRIPTION" | "DEMO" | "NONE";
export type Access = "FULL" | "RESTRICTED";

export type Revenue = {
  currency: string;
  gross: Money;
  refunded: Money;
  providerFees: Money;
  net: Money;
};

export type Overview = {
  month: string;
  users: { total: number; newInMonth: number };
  subscriptions: {
    byStatus: Partial<Record<SubscriptionStatus, number>>;
    byPlan: Record<string, number>;
  };
  demos: { active: number };
  payments: { approvedInMonth: number; rejectedInMonth: number };
  revenue: Revenue[] | null;
  commissions: { approvedUnpaid: Money[] | null; accruedReleasable: Money[] | null };
};

export type CustomerMatch = {
  id: string;
  email: string;
  name: string | null;
  legalName: string | null;
  createdAt: string;
  planCode: PlanCode | null;
  subscriptionStatus: SubscriptionStatus | null;
  hasPassword: boolean;
};

export type BillingProfile = {
  country: string | null;
  taxIdType: string | null;
  taxId: string | null;
  legalName: string | null;
  vatCondition: string | null;
};

export type Entitlements = {
  enforced: boolean;
  access: Access;
  plan: { code: PlanCode | null; versionId: string | null; source: PlanSource };
  period: { start: string; end: string };
  limits: Partial<Record<EntitlementKey, number | null>>;
  usage: Record<string, number>;
  computedAt: string;
};

export type Override = {
  id: string;
  userId: string;
  key: EntitlementKey;
  value: number | null;
  expiresAt: string | null;
  reason: string;
  createdBy: string;
  createdAt: string;
  revokedAt: string | null;
  revokedBy: string | null;
};

export type Subscription = {
  id: string;
  status: SubscriptionStatus;
  planVersionId: string;
  pendingPlanVersionId: string | null;
  price: Money;
  charge: Money | null;
  lastCheckoutStatus: CheckoutStatus | null;
  providerSubscriptionId: string | null;
  providerStatus: string | null;
  providerNextPaymentAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  paidThrough: string | null;
  graceUntil: string | null;
  suspendedUntil: string | null;
  cancelAtPeriodEnd: boolean;
  disputed: boolean;
  canceledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
};

export type Payment = {
  id: string;
  providerPaymentId: string | null;
  status: PaymentStatus;
  statusDetail: string | null;
  amount: Money;
  refunded: Money;
  refundable: Money;
  providerFee: Money | null;
  approvedAt: string | null;
  createdAt: string;
  invoice: { id: string; status: InvoiceStatus; invoiceNumber: string | null } | null;
};

export type DemoGrant = {
  id: string;
  userId: string;
  invitationId: string | null;
  planVersionId: string;
  startsAt: string;
  endsAt: string;
  revokedAt: string | null;
};

export type Attribution = {
  id: string;
  userId: string;
  resellerId: string;
  referralCodeId: string | null;
  source: AttributionSource;
  sequence: number;
  reason: string | null;
  createdAt: string;
};

export type CustomerFile = {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  billingProfile: BillingProfile | null;
  entitlements: Entitlements;
  overrides: Override[];
  subscription: Subscription | null;
  payments: Payment[];
  demo: DemoGrant | null;
  attribution: Attribution | null;
  resellerId: string | null;
};

export type UsageRow = {
  userId: string;
  day: string;
  agentId: string | null;
  model: string;
  runs: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  estimatedCostMicros: number | null;
  costCurrency: string | null;
  priceVersion: number | null;
  computedAt: string;
};

export type ResellerOption = {
  id: string;
  userId: string | null;
  displayName: string;
  status: string;
};
