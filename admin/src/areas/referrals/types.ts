import type { Money } from "../../api/types";

export type ResellerStatus = "ACTIVE" | "SUSPENDED" | "CLOSED";
export type ReferralCodeStatus = "ACTIVE" | "DISABLED";
export type AttributionSource = "COOKIE" | "INVITATION" | "ADMIN";
export type CommissionKind = "ACCRUAL" | "REVERSAL";
export type CommissionStatus = "ACCRUED" | "APPROVED" | "PAID" | "REVERSED" | "HELD";
export type PayoutStatus = "DRAFT" | "EXPORTED" | "PAID";
export type SubscriptionStatus = "INCOMPLETE" | "ACTIVE" | "PAST_DUE" | "SUSPENDED" | "PAUSED" | "CANCELED";

export type ReferralCode = {
  id: string;
  resellerId: string;
  code: string;
  status: ReferralCodeStatus;
  disabledAt: string | null;
  createdAt: string;
};

export type Reseller = {
  id: string;
  userId: string;
  displayName: string;
  status: ResellerStatus;
  rateBps: number;
  maxPaidCycles: number;
  createdAt: string;
  codes: ReferralCode[];
};

export type ResellerClick = {
  day: string;
  referralCodeId: string;
  clicks: number;
};

export type ResellerBilling = {
  legalName: string | null;
  taxId: string | null;
  vatCondition: string | null;
  payoutMethod: string | null;
  payoutReference: string | null;
  termsVersion: string | null;
  termsAcceptedAt: string | null;
};

export type CommissionTotal = {
  status: CommissionStatus;
  amount: Money;
};

export type ResellerDetail = {
  reseller: Reseller;
  customersCount: number;
  clicks: ResellerClick[];
  billing: ResellerBilling | null;
  commissionTotals: CommissionTotal[] | null;
};

export type ResellerCustomer = {
  userId: string;
  email: string;
  source: AttributionSource;
  referralCodeId: string | null;
  attributedAt: string;
  planCode: string | null;
  subscriptionStatus: SubscriptionStatus | null;
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

export type Commission = {
  id: string;
  resellerId: string;
  customerUserId: string;
  paymentId: string | null;
  kind: CommissionKind;
  reversesEntryId: string | null;
  cycleNumber: number;
  amount: Money;
  status: CommissionStatus;
  releaseAt: string;
  payoutId: string | null;
  createdAt: string;
};

export type Payout = {
  id: string;
  resellerId: string;
  periodEnd: string;
  total: Money;
  status: PayoutStatus;
  paidAt: string | null;
  transferReference: string | null;
  createdAt: string;
};

export type PayoutDetail = {
  payout: Payout;
  entries: Commission[];
};

export type NewReseller = {
  userId: string;
  displayName: string;
  legalName: string;
  taxId: string;
  vatCondition: string;
  payoutMethod: string | null;
  payoutReference: string | null;
};

export type CustomerMatch = {
  id: string;
  email: string;
  name: string | null;
  legalName: string | null;
  createdAt: string;
  planCode: string | null;
  subscriptionStatus: SubscriptionStatus | null;
};
