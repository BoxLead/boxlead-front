import type { Money } from "../../api/types";

export type PlanCode = "DEMO" | "STARTER" | "BUSINESS" | "ENTERPRISE";

export type SubscriptionStatus = "INCOMPLETE" | "ACTIVE" | "PAST_DUE" | "SUSPENDED" | "PAUSED" | "CANCELED";

export type PaymentStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED"
  | "CHARGED_BACK"
  | "IN_MEDIATION"
  | "CANCELLED";

export type RefundStatus = "REQUESTED" | "APPROVED" | "REJECTED";

export type InvoiceStatus = "PENDING" | "ISSUED" | "VOIDED";

export type SubscriptionRow = {
  id: string;
  userId: string;
  email: string | null;
  planCode: string | null;
  status: SubscriptionStatus;
  price: Money;
  charge: Money;
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

export type PaymentInvoice = {
  id: string;
  status: InvoiceStatus;
  invoiceNumber: string | null;
};

export type PaymentRow = {
  id: string;
  userId: string;
  email: string | null;
  subscriptionId: string | null;
  providerPaymentId: string | null;
  status: PaymentStatus;
  statusDetail: string | null;
  amount: Money;
  refunded: Money;
  refundable: Money;
  providerFee: Money;
  approvedAt: string | null;
  createdAt: string;
  invoice: PaymentInvoice | null;
};

export type RefundRow = {
  id: string;
  paymentId: string;
  userId: string;
  amount: Money | null;
  status: RefundStatus;
  providerRefundId: string | null;
  requestedBy: string | null;
  createdAt: string;
};

export type RefundResult = {
  id: string;
  paymentId: string;
  amount: Money | null;
  status: RefundStatus;
  providerRefundId: string | null;
  createdAt: string;
};

export type InvoiceReceiver = {
  legalName?: string;
  taxIdType?: string;
  taxId?: string;
  vatCondition?: string;
  billingEmail?: string;
};

export type InvoiceRow = {
  id: string;
  paymentId: string;
  userId: string;
  status: InvoiceStatus;
  amount: Money;
  invoiceNumber: string | null;
  issuedAt: string | null;
  issuedBy: string | null;
  voidedAt: string | null;
  voidedBy: string | null;
  receiver: InvoiceReceiver | null;
  createdAt: string;
};
