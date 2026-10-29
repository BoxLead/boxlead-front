import type { AdminPage, AdminRole, Money } from "../../api/types";
import type { PlanSource } from "../../status";

export type UsageGrouping = "USER" | "DAY" | "MODEL";

export type UsageTotals = {
  runs: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  estimatedCostMicros: number;
  costCurrency: string | null;
  rowsWithoutCost: number;
};

export type UsageSummaryRow = UsageTotals & {
  key: string;
  email: string | null;
};

export type UsageSummary = AdminPage<UsageSummaryRow> & {
  totals: UsageTotals[];
};

export type UsageDay = {
  userId: string;
  day: string;
  agentId: string;
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

export type ConsumerRequestKind = "WITHDRAWAL" | "CANCELLATION";

export type ConsumerRequestStatus = "RECEIVED" | "RESOLVED" | "REJECTED";

export type ConsumerRequestDecision = Exclude<ConsumerRequestStatus, "RECEIVED">;

export type ConsumerRequest = {
  id: string;
  kind: ConsumerRequestKind;
  code: string;
  email: string;
  userId: string | null;
  subscriptionId: string | null;
  details: string | null;
  status: ConsumerRequestStatus;
  resolution: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  receiptSentAt: string | null;
  createdAt: string;
  refundable: Money | null;
};

export type MemberRole = {
  grantId: string;
  role: AdminRole;
  grantedAt: string;
  grantedBy: string | null;
};

export type TeamMember = {
  userId: string;
  email: string;
  name: string | null;
  hasPassword: boolean;
  roles: MemberRole[];
  factorConfirmed: boolean;
  enrollmentOpenUntil: string | null;
  lastAdminSessionAt: string | null;
  planSource: PlanSource;
};

export type AdminGrant = {
  id: string;
  userId: string;
  role: AdminRole;
  grantedAt: string;
  enrollmentOpenUntil: string | null;
};

export type CustomerMatch = {
  id: string;
  email: string;
  name: string | null;
  legalName: string | null;
  createdAt: string;
  hasPassword: boolean;
};

export type AuditActorType = "USER" | "ADMIN" | "SYSTEM" | "PROVIDER";

export type AuditEvent = {
  id: string;
  occurredAt: string;
  actorType: AuditActorType;
  actorUserId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  before: unknown;
  after: unknown;
  reason: string | null;
  ip: string | null;
  requestId: string | null;
};
