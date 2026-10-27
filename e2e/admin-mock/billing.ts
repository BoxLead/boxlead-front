import type { Money } from "../../admin/src/api/types.ts";
import type {
  InvoiceRow,
  PaymentRow,
  PaymentStatus,
  RefundRow,
  SubscriptionRow,
  SubscriptionStatus,
} from "../../admin/src/areas/billing/types.ts";
import { failure, notFound, ok, page, type AdminIdentity, type MockArea, type MockReply, type MockRequest, type ResetOptions } from "./http.ts";

const DAY = 86_400_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PLAN_CODES = ["DEMO", "STARTER", "BUSINESS", "ENTERPRISE"];
const SUBSCRIPTION_STATUSES: SubscriptionStatus[] = ["INCOMPLETE", "ACTIVE", "PAST_DUE", "SUSPENDED", "PAUSED", "CANCELED"];
const PAYMENT_STATUSES: PaymentStatus[] = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
  "CHARGED_BACK",
  "IN_MEDIATION",
  "CANCELLED",
];
const REFUND_STATUSES = ["REQUESTED", "APPROVED", "REJECTED"];
const INVOICE_STATUSES = ["PENDING", "ISSUED", "VOIDED"];
const MAX_INVOICE_NUMBER = 50;
const MAX_REASON = 500;

const ars = (amountMinor: number): Money => ({ amountMinor, currency: "ARS" });
const usd = (amountMinor: number): Money => ({ amountMinor, currency: "USD" });
const STARTER = { price: usd(6000), charge: ars(8700000) };
const BUSINESS = { price: usd(20000), charge: ars(29000000) };

type StoredPayment = Omit<PaymentRow, "refundable">;
type StoredRefund = Omit<RefundRow, "effectiveAmount">;

type State = {
  subscriptions: SubscriptionRow[];
  payments: StoredPayment[];
  refunds: StoredRefund[];
  invoices: InvoiceRow[];
};

let sequence = 0;

function id(prefix: string, n: number): string {
  const head = `${prefix}${(Math.imul(n, 0x9e3779b1) >>> 8).toString(16).padStart(6, "0")}`.slice(0, 8);
  return `${head}-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

const USERS = ["ana", "bruno", "carla", "diego", "elena", "franco", "gabi"].map((name, index) => ({
  userId: id("0c", index + 1),
  email: `${name}@example.com`,
}));

function receiver(legalName: string, taxId: string, vatCondition: string, billingEmail: string) {
  return {
    country: "AR",
    taxIdType: "CUIT",
    taxId,
    legalName,
    vatCondition,
    addressLine: "Calle 123",
    city: "Rosario",
    province: "Santa Fe",
    postalCode: "2000",
    billingEmail,
  };
}

function seed(now: Date): State {
  const at = (days: number) => new Date(now.getTime() + days * DAY).toISOString();
  const [ana, bruno, carla, diego, elena, franco, gabi] = USERS;
  const subscription = (
    n: number,
    user: (typeof USERS)[number],
    planCode: string | null,
    status: SubscriptionStatus,
    plan: { price: Money; charge: Money },
    createdDays: number,
    extra: Partial<SubscriptionRow> = {},
  ): SubscriptionRow => ({
    id: id("5b", n),
    userId: user.userId,
    email: user.email,
    planCode,
    status,
    price: plan.price,
    charge: plan.charge,
    currentPeriodEnd: at(12),
    paidThrough: at(12),
    graceUntil: null,
    suspendedUntil: null,
    cancelAtPeriodEnd: false,
    disputed: false,
    canceledAt: null,
    cancelReason: null,
    createdAt: at(createdDays),
    ...extra,
  });
  const subscriptions = [
    subscription(1, gabi, null, "INCOMPLETE", STARTER, -1, { currentPeriodEnd: null, paidThrough: null }),
    subscription(2, franco, "STARTER", "SUSPENDED", STARTER, -20, { disputed: true, paidThrough: at(-2) }),
    subscription(3, elena, null, "CANCELED", STARTER, -40, { canceledAt: at(-5), cancelReason: "USER_CANCELED" }),
    subscription(4, diego, "BUSINESS", "ACTIVE", BUSINESS, -50, { cancelAtPeriodEnd: true }),
    subscription(5, carla, "STARTER", "PAUSED", STARTER, -60),
    subscription(6, bruno, "BUSINESS", "PAST_DUE", BUSINESS, -70, { graceUntil: at(3), paidThrough: at(-1) }),
    subscription(7, ana, "STARTER", "ACTIVE", STARTER, -90),
  ];

  const payment = (
    n: number,
    user: (typeof USERS)[number],
    subscriptionId: string,
    status: PaymentStatus,
    amount: Money,
    refundedMinor: number,
    createdDays: number,
    statusDetail: string,
  ): StoredPayment => ({
    id: id("9e", n),
    userId: user.userId,
    email: user.email,
    subscriptionId,
    providerPaymentId: String(1320000000 + n),
    status,
    statusDetail,
    amount,
    refunded: { amountMinor: refundedMinor, currency: amount.currency },
    providerFee: { amountMinor: Math.round(amount.amountMinor * 0.05), currency: amount.currency },
    approvedAt: ["APPROVED", "REFUNDED", "PARTIALLY_REFUNDED", "CHARGED_BACK"].includes(status) ? at(createdDays) : null,
    createdAt: at(createdDays),
    invoice: null,
  });
  const payments = [
    payment(1, ana, id("5b", 7), "APPROVED", STARTER.charge, 0, -2, "accredited"),
    payment(2, diego, id("5b", 4), "APPROVED", BUSINESS.charge, 0, -4, "accredited"),
    payment(3, bruno, id("5b", 6), "REJECTED", BUSINESS.charge, 0, -6, "cc_rejected_insufficient_amount"),
    payment(4, carla, id("5b", 5), "PARTIALLY_REFUNDED", STARTER.charge, 2000000, -10, "partially_refunded"),
    payment(5, franco, id("5b", 2), "CHARGED_BACK", STARTER.charge, 0, -18, "settled"),
    payment(6, elena, id("5b", 3), "REFUNDED", STARTER.charge, STARTER.charge.amountMinor, -35, "refunded"),
    payment(7, diego, id("5b", 4), "APPROVED", BUSINESS.charge, 0, -34, "accredited"),
    payment(8, ana, id("5b", 7), "APPROVED", STARTER.charge, 0, -32, "accredited"),
  ];

  const invoice = (n: number, paymentIndex: number, status: InvoiceRow["status"], extra: Partial<InvoiceRow>, who: ReturnType<typeof receiver> | null) => {
    const paid = payments[paymentIndex];
    const row: InvoiceRow = {
      id: id("1f", n),
      paymentId: paid.id,
      userId: paid.userId,
      status,
      amount: paid.amount,
      invoiceNumber: null,
      issuedAt: null,
      issuedBy: null,
      voidedAt: null,
      voidedBy: null,
      receiver: who ?? {},
      createdAt: paid.approvedAt ?? paid.createdAt,
      ...extra,
    };
    paid.invoice = { id: row.id, status: row.status, invoiceNumber: row.invoiceNumber };
    return row;
  };
  const invoices = [
    invoice(1, 7, "ISSUED", { invoiceNumber: "0003-00000011", issuedAt: at(-31), issuedBy: id("0b", 1) }, receiver("Ana Pérez", "20123456786", "MONOTRIBUTO", ana.email)),
    invoice(2, 6, "PENDING", {}, receiver("Diego Comercio SRL", "30712345671", "RESPONSABLE_INSCRIPTO", diego.email)),
    invoice(3, 5, "VOIDED", { invoiceNumber: "0003-00000010", issuedAt: at(-34), voidedAt: at(-30), voidedBy: id("0b", 1) }, null),
    invoice(4, 3, "ISSUED", { invoiceNumber: "0003-00000012", issuedAt: at(-9), issuedBy: id("0b", 1) }, receiver("Carla Gómez", "27234567891", "CONSUMIDOR_FINAL", carla.email)),
    invoice(5, 1, "PENDING", {}, receiver("Diego Comercio SRL", "30712345671", "RESPONSABLE_INSCRIPTO", diego.email)),
    invoice(6, 0, "PENDING", {}, receiver("Ana Pérez", "20123456786", "MONOTRIBUTO", ana.email)),
  ];

  const refunds: StoredRefund[] = [
    { id: id("7a", 1), paymentId: payments[6].id, userId: diego.userId, amount: null, status: "REQUESTED", providerRefundId: null, requestedBy: id("0b", 1), createdAt: at(-1) },
    { id: id("7a", 2), paymentId: payments[0].id, userId: ana.userId, amount: ars(500000), status: "REJECTED", providerRefundId: "rf-2002", requestedBy: id("0b", 1), createdAt: at(-1.5) },
    { id: id("7a", 3), paymentId: payments[3].id, userId: carla.userId, amount: ars(2000000), status: "APPROVED", providerRefundId: "rf-2001", requestedBy: id("0b", 1), createdAt: at(-9) },
    { id: id("7a", 4), paymentId: payments[5].id, userId: elena.userId, amount: null, status: "APPROVED", providerRefundId: "rf-2000", requestedBy: null, createdAt: at(-30) },
    { id: id("7a", 5), paymentId: payments[7].id, userId: ana.userId, amount: ars(1000000), status: "REQUESTED", providerRefundId: "rf-2003", requestedBy: id("0b", 1), createdAt: at(-2) },
  ];

  return { subscriptions, payments, refunds, invoices };
}

export const REFUND_IN_PROCESS_SCENARIO = "billing-refund-in-process";
export const PROVIDER_DOWN_SCENARIO = "billing-provider-down";

type ProviderAnswer = "APPROVED" | "IN_PROCESS" | "DOWN";

let state: State = seed(new Date());
let provider: ProviderAnswer = "APPROVED";

function reset({ scenario, now }: ResetOptions) {
  sequence = 0;
  state = scenario === "empty" ? { subscriptions: [], payments: [], refunds: [], invoices: [] } : seed(now);
  provider = scenario === REFUND_IN_PROCESS_SCENARIO ? "IN_PROCESS" : scenario === PROVIDER_DOWN_SCENARIO ? "DOWN" : "APPROVED";
}

const PROVIDER_UNAVAILABLE = failure(502, "The payment provider did not answer", "PROVIDER_UNAVAILABLE");

function answer(refund: StoredRefund, providerRefundId: string): MockReply | null {
  if (provider === "DOWN") return PROVIDER_UNAVAILABLE;
  refund.providerRefundId = providerRefundId;
  refund.status = provider === "IN_PROCESS" ? "REQUESTED" : "APPROVED";
  return null;
}

type Parsed<T> = { values: T[] } | { error: MockReply };

function enumFilter<T extends string>(query: URLSearchParams, key: string, allowed: readonly string[]): Parsed<T> {
  const values = query.getAll(key).filter(Boolean);
  if (values.some((value) => !allowed.includes(value))) return { error: failure(400, `Unknown ${key}`) };
  return { values: values as T[] };
}

function buenosAiresDay(iso: string): string {
  return new Date(Date.parse(iso) - 3 * 3_600_000).toISOString().slice(0, 10);
}

function within(query: URLSearchParams, iso: string): boolean {
  const from = query.get("from");
  const to = query.get("to");
  const day = buenosAiresDay(iso);
  return (!from || day >= from) && (!to || day <= to);
}

function badRange(query: URLSearchParams): MockReply | null {
  const from = query.get("from");
  const to = query.get("to");
  if (from && !/^\d{4}-\d{2}-\d{2}$/.test(from)) return failure(400, "Invalid from");
  if (to && !/^\d{4}-\d{2}-\d{2}$/.test(to)) return failure(400, "Invalid to");
  if (from && to && from > to) return failure(400, "The range starts after it ends");
  return null;
}

function newestFirst<T extends { createdAt: string }>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

function listSubscriptions({ query }: MockRequest): MockReply {
  const status = enumFilter<SubscriptionStatus>(query, "status", SUBSCRIPTION_STATUSES);
  if ("error" in status) return status.error;
  const plan = enumFilter<string>(query, "plan", PLAN_CODES);
  if ("error" in plan) return plan.error;
  const range = badRange(query);
  if (range) return range;
  const rows = state.subscriptions.filter(
    (row) =>
      (status.values.length === 0 || status.values.includes(row.status)) &&
      (plan.values.length === 0 || (row.planCode !== null && plan.values.includes(row.planCode))) &&
      within(query, row.createdAt),
  );
  return page(newestFirst(rows), query, 50);
}

function isRefundable(payment: StoredPayment): boolean {
  return payment.status === "APPROVED" || payment.status === "PARTIALLY_REFUNDED";
}

function committed(payment: StoredPayment): number {
  return state.refunds
    .filter((refund) => refund.paymentId === payment.id && refund.status !== "REJECTED")
    .reduce((sum, refund) => sum + (refund.amount?.amountMinor ?? payment.amount.amountMinor), 0);
}

function remaining(payment: StoredPayment): number {
  return payment.amount.amountMinor - Math.max(payment.refunded.amountMinor, committed(payment));
}

function withRefundable(payment: StoredPayment): PaymentRow {
  const left = isRefundable(payment) ? Math.max(0, remaining(payment)) : 0;
  return { ...payment, refundable: { amountMinor: left, currency: payment.amount.currency } };
}

function listPayments({ query }: MockRequest): MockReply {
  const status = enumFilter<PaymentStatus>(query, "status", PAYMENT_STATUSES);
  if ("error" in status) return status.error;
  const range = badRange(query);
  if (range) return range;
  const userId = query.get("userId");
  if (userId && !UUID.test(userId)) return failure(400, "Invalid userId");
  if (userId && !USERS.some((user) => user.userId === userId)) return notFound();
  const rows = state.payments.filter(
    (row) =>
      (status.values.length === 0 || status.values.includes(row.status)) &&
      (!userId || row.userId === userId) &&
      within(query, row.createdAt),
  );
  return page(newestFirst(rows).map(withRefundable), query, 50);
}

function effectiveAmount(refund: StoredRefund): Money {
  const payment = state.payments.find((row) => row.id === refund.paymentId);
  if (!payment) return refund.amount ?? { amountMinor: 0, currency: "ARS" };
  const ofPayment = state.refunds
    .filter((row) => row.paymentId === payment.id)
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id.localeCompare(b.id));
  let taken = 0;
  for (const row of ofPayment) {
    const amount = row.amount?.amountMinor ?? Math.max(0, payment.amount.amountMinor - taken);
    if (row.id === refund.id) return { amountMinor: amount, currency: payment.amount.currency };
    if (row.status !== "REJECTED") taken += amount;
  }
  return refund.amount ?? { amountMinor: 0, currency: payment.amount.currency };
}

function listRefunds({ query }: MockRequest): MockReply {
  const status = enumFilter<string>(query, "status", REFUND_STATUSES);
  if ("error" in status) return status.error;
  const rows = state.refunds.filter((row) => status.values.length === 0 || status.values.includes(row.status));
  return page(newestFirst(rows).map((row): RefundRow => ({ ...row, effectiveAmount: effectiveAmount(row) })), query, 50);
}

function listInvoices({ query }: MockRequest): MockReply {
  const status = enumFilter<string>(query, "status", INVOICE_STATUSES);
  if ("error" in status) return status.error;
  const range = badRange(query);
  if (range) return range;
  const rows = state.invoices.filter((row) => (status.values.length === 0 || status.values.includes(row.status)) && within(query, row.createdAt));
  return page([...rows].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)), query, 50);
}

function reasonOf(body: Record<string, unknown>): string | null {
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  return reason && reason.length <= MAX_REASON ? reason : null;
}

function selfOperation(admin: AdminIdentity, userId: string): MockReply | null {
  if (userId === admin.userId && !admin.roles.includes("OWNER")) {
    return failure(403, "An admin can not operate on their own account", "ADMIN_SELF_OPERATION");
  }
  return null;
}

const NOT_ACTIVE = failure(409, "The subscription is not active", "SUBSCRIPTION_NOT_ACTIVE");

function changeSubscription({ match, body, admin }: MockRequest): MockReply {
  if (!reasonOf(body)) return failure(400, "A reason is required");
  const userId = decodeURIComponent(match[1]);
  const self = selfOperation(admin, userId);
  if (self) return self;
  const expected = body.expectedSubscriptionId;
  if (expected !== undefined && expected !== null && (typeof expected !== "string" || !UUID.test(expected))) {
    return failure(400, "Invalid expectedSubscriptionId");
  }
  const live = state.subscriptions.find((row) => row.userId === userId && row.status !== "CANCELED");
  if (!live) return NOT_ACTIVE;
  if (typeof expected === "string" && expected !== live.id) {
    return failure(409, "The live subscription is not the one you saw, reload and try again", "SUBSCRIPTION_CHANGED");
  }
  const action = match[2];
  if (action === "pause") {
    if (!["ACTIVE", "PAST_DUE", "SUSPENDED"].includes(live.status)) return NOT_ACTIVE;
    live.status = "PAUSED";
  } else if (action === "resume") {
    if (live.status !== "PAUSED") return NOT_ACTIVE;
    live.status = "ACTIVE";
    live.graceUntil = null;
  } else {
    live.status = "CANCELED";
    live.canceledAt = new Date().toISOString();
    live.cancelReason = "ADMIN_CANCELED";
  }
  return { status: 204 };
}

function refundResult(refund: StoredRefund) {
  return {
    id: refund.id,
    paymentId: refund.paymentId,
    amount: refund.amount,
    status: refund.status,
    providerRefundId: refund.providerRefundId,
    createdAt: refund.createdAt,
  };
}

function isLatestApproval(payment: StoredPayment): boolean {
  const approved = state.payments
    .filter((row) => row.subscriptionId === payment.subscriptionId && row.approvedAt)
    .sort((a, b) => Date.parse(b.approvedAt ?? "") - Date.parse(a.approvedAt ?? ""));
  return approved[0]?.id === payment.id;
}

function moneyOf(value: unknown): Money | null | "invalid" {
  if (value === undefined || value === null) return null;
  if (typeof value !== "object") return "invalid";
  const { amountMinor, currency } = value as Record<string, unknown>;
  if (typeof amountMinor !== "number" || !Number.isSafeInteger(amountMinor) || typeof currency !== "string") return "invalid";
  return { amountMinor, currency };
}

function refundPayment({ match, body, admin }: MockRequest): MockReply {
  const reason = reasonOf(body);
  if (!reason) return failure(400, "A reason is required");
  const payment = state.payments.find((row) => row.id === decodeURIComponent(match[1]));
  if (!payment) return failure(404, "Payment not found");
  const self = selfOperation(admin, payment.userId);
  if (self) return self;
  if (!isRefundable(payment)) return failure(409, "The payment cannot be refunded");
  const amount = moneyOf(body.amount);
  if (amount === "invalid") return failure(400, "Invalid amount");
  if (amount && amount.currency !== payment.amount.currency) return failure(400, "A refund must be in the currency of its payment");
  const left = remaining(payment);
  const requested = amount ? amount.amountMinor : left;
  if (requested <= 0 || requested > left) return failure(422, "The refund exceeds the payment", "REFUND_EXCEEDS_PAYMENT");
  const closesTheSubscription = requested === left && isLatestApproval(payment);
  sequence += 1;
  const refund: StoredRefund = {
    id: id("7b", sequence),
    paymentId: payment.id,
    userId: payment.userId,
    amount,
    status: "REQUESTED",
    providerRefundId: null,
    requestedBy: admin.userId,
    createdAt: new Date().toISOString(),
  };
  state.refunds.push(refund);
  const down = answer(refund, `rf-${3000 + sequence}`);
  if (down) return down;
  if (closesTheSubscription) {
    const subscription = state.subscriptions.find((row) => row.id === payment.subscriptionId && row.status !== "CANCELED");
    if (subscription) {
      subscription.status = "CANCELED";
      subscription.canceledAt = new Date().toISOString();
      subscription.cancelReason = "REFUNDED";
    }
  }
  return { status: 201, body: refundResult(refund) };
}

function retryRefund({ match, body, admin }: MockRequest): MockReply {
  if (!reasonOf(body)) return failure(400, "A reason is required");
  const refund = state.refunds.find((row) => row.id === decodeURIComponent(match[1]));
  if (!refund) return failure(404, "Refund not found");
  const payment = state.payments.find((row) => row.id === refund.paymentId);
  const self = payment ? selfOperation(admin, payment.userId) : null;
  if (self) return self;
  if (refund.providerRefundId) return failure(409, "The provider already answered this refund", "REFUND_ALREADY_ANSWERED");
  const down = answer(refund, `rf-${3500 + state.refunds.indexOf(refund)}`);
  if (down) return down;
  return ok(refundResult(refund));
}

function syncPayment(invoice: InvoiceRow) {
  const payment = state.payments.find((row) => row.id === invoice.paymentId);
  if (payment) payment.invoice = { id: invoice.id, status: invoice.status, invoiceNumber: invoice.invoiceNumber };
}

function markIssued({ match, body, admin }: MockRequest): MockReply {
  if (!reasonOf(body)) return failure(400, "A reason is required");
  const number = typeof body.invoiceNumber === "string" ? body.invoiceNumber.trim() : "";
  if (!number || number.length > MAX_INVOICE_NUMBER) return failure(400, "Invalid invoice number");
  const issuedAt = typeof body.issuedAt === "string" ? Date.parse(body.issuedAt) : Date.now();
  if (Number.isNaN(issuedAt)) return failure(400, "Invalid issuedAt");
  if (issuedAt > Date.now()) return failure(400, "An invoice cannot be issued in the future");
  const invoice = state.invoices.find((row) => row.id === decodeURIComponent(match[1]));
  if (!invoice) return failure(404, "Invoice not found");
  if (invoice.status !== "PENDING") return failure(409, "Only a pending invoice can be issued");
  invoice.status = "ISSUED";
  invoice.invoiceNumber = number;
  invoice.issuedAt = new Date(issuedAt).toISOString();
  invoice.issuedBy = admin.userId;
  syncPayment(invoice);
  return ok(invoice);
}

function markVoided({ match, body, admin }: MockRequest): MockReply {
  if (!reasonOf(body)) return failure(400, "A reason is required");
  const invoice = state.invoices.find((row) => row.id === decodeURIComponent(match[1]));
  if (!invoice) return failure(404, "Invoice not found");
  if (invoice.status === "VOIDED") return failure(409, "The invoice is already voided");
  invoice.status = "VOIDED";
  invoice.voidedAt = new Date().toISOString();
  invoice.voidedBy = admin.userId;
  syncPayment(invoice);
  return ok(invoice);
}

export const billing: MockArea = {
  routes: [
    { method: "GET", pattern: /^\/admin\/subscriptions$/, access: "ANY", handle: listSubscriptions },
    { method: "GET", pattern: /^\/admin\/payments$/, access: "ANY", handle: listPayments },
    { method: "GET", pattern: /^\/admin\/refunds$/, access: ["FINANCE"], handle: listRefunds },
    { method: "GET", pattern: /^\/admin\/invoices$/, access: ["FINANCE"], handle: listInvoices },
    {
      method: "POST",
      pattern: /^\/admin\/customers\/([^/]+)\/subscription\/(pause|resume|cancel)$/,
      access: ["OWNER"],
      handle: changeSubscription,
    },
    { method: "POST", pattern: /^\/admin\/payments\/([^/]+)\/refunds$/, access: ["FINANCE"], handle: refundPayment },
    { method: "POST", pattern: /^\/admin\/refunds\/([^/]+)\/retry$/, access: ["FINANCE"], handle: retryRefund },
    { method: "POST", pattern: /^\/admin\/invoices\/([^/]+)\/issued$/, access: ["FINANCE"], handle: markIssued },
    { method: "POST", pattern: /^\/admin\/invoices\/([^/]+)\/voided$/, access: ["FINANCE"], handle: markVoided },
  ],
  reset,
};
