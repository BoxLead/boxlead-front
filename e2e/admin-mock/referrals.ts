import { randomUUID } from "node:crypto";
import type {
  Attribution,
  Commission,
  CommissionStatus,
  Payout,
  ReferralCode,
  Reseller,
  ResellerBilling,
  ResellerClick,
  ResellerCustomer,
} from "../../admin/src/areas/referrals/types.ts";
import { failure, hasRole, notFound, ok, page, type MockReply, type MockRequest, type MockArea } from "./http.ts";

const DAY = 86_400_000;
const CURRENCY = "ARS";
const CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const BUENOS_AIRES = "America/Argentina/Buenos_Aires";

type StoredReseller = Omit<Reseller, "codes"> & { billing: ResellerBilling };

type State = {
  resellers: StoredReseller[];
  codes: ReferralCode[];
  clicks: ResellerClick[];
  customers: (ResellerCustomer & { resellerId: string })[];
  commissions: Commission[];
  payouts: Payout[];
};

let state: State = empty();

function empty(): State {
  return { resellers: [], codes: [], clicks: [], customers: [], commissions: [], payouts: [] };
}

function id(kind: number, index: number): string {
  return `${String(kind * 100 + index).padStart(8, "0")}-0b0e-4000-8000-${String(index).padStart(12, "0")}`;
}

function iso(time: number): string {
  return new Date(time).toISOString();
}

function dayOf(time: number): string {
  return new Date(time).toLocaleDateString("en-CA", { timeZone: BUENOS_AIRES });
}

function money(amountMinor: number) {
  return { amountMinor, currency: CURRENCY };
}

function seeded(now: number): State {
  const north = id(1, 1);
  const laura = id(1, 2);
  const south = id(1, 3);
  const resellers: StoredReseller[] = [
    {
      id: north,
      userId: id(2, 1),
      displayName: "Agencia Norte",
      status: "ACTIVE",
      rateBps: 5000,
      maxPaidCycles: 6,
      createdAt: iso(now - 90 * DAY),
      billing: {
        legalName: "Agencia Norte de Prueba SRL",
        taxId: "30-11111111-9",
        vatCondition: "RESPONSABLE_INSCRIPTO",
        payoutMethod: "Transferencia bancaria",
        payoutReference: "agencia.norte.prueba",
        termsVersion: "2026-10",
        termsAcceptedAt: iso(now - 89 * DAY),
      },
    },
    {
      id: laura,
      userId: id(2, 2),
      displayName: "Laura Gómez CM",
      status: "ACTIVE",
      rateBps: 5000,
      maxPaidCycles: 6,
      createdAt: iso(now - 40 * DAY),
      billing: {
        legalName: "Laura Gómez",
        taxId: "27-22222222-4",
        vatCondition: "MONOTRIBUTO",
        payoutMethod: null,
        payoutReference: null,
        termsVersion: null,
        termsAcceptedAt: null,
      },
    },
    {
      id: south,
      userId: id(2, 3),
      displayName: "Estudio Sur",
      status: "SUSPENDED",
      rateBps: 5000,
      maxPaidCycles: 6,
      createdAt: iso(now - 120 * DAY),
      billing: {
        legalName: "Estudio Sur de Prueba SA",
        taxId: "30-33333333-7",
        vatCondition: "RESPONSABLE_INSCRIPTO",
        payoutMethod: "Transferencia bancaria",
        payoutReference: "estudio.sur.prueba",
        termsVersion: "2026-10",
        termsAcceptedAt: iso(now - 119 * DAY),
      },
    },
  ];
  const codes: ReferralCode[] = [
    { id: id(3, 1), resellerId: north, code: "7KQ2M9XTRB", status: "ACTIVE", disabledAt: null, createdAt: iso(now - 89 * DAY) },
    { id: id(3, 2), resellerId: north, code: "H3N8PW4CZD", status: "DISABLED", disabledAt: iso(now - 20 * DAY), createdAt: iso(now - 80 * DAY) },
    { id: id(3, 3), resellerId: laura, code: "P9V6T2KQMX", status: "ACTIVE", disabledAt: null, createdAt: iso(now - 39 * DAY) },
  ];
  const clicks: ResellerClick[] = [];
  for (let back = 0; back < 45; back += 1) {
    const day = dayOf(now - back * DAY);
    const first = (back * 7) % 5;
    if (first > 0) clicks.push({ day, referralCodeId: codes[0].id, clicks: first });
    if (back > 20 && back % 3 === 0) clicks.push({ day, referralCodeId: codes[1].id, clicks: 1 });
    if (back % 4 === 0) clicks.push({ day, referralCodeId: codes[2].id, clicks: 2 });
  }
  const ana = id(4, 1);
  const bruno = id(4, 2);
  const carla = id(4, 3);
  const dario = id(4, 4);
  const customers: State["customers"] = [
    { resellerId: north, userId: ana, email: "ana@example.com", source: "COOKIE", referralCodeId: codes[0].id, attributedAt: iso(now - 70 * DAY), planCode: "BUSINESS", subscriptionStatus: "ACTIVE" },
    { resellerId: north, userId: bruno, email: "bruno@example.com", source: "INVITATION", referralCodeId: null, attributedAt: iso(now - 60 * DAY), planCode: "STARTER", subscriptionStatus: "PAST_DUE" },
    { resellerId: north, userId: carla, email: "carla@example.com", source: "COOKIE", referralCodeId: codes[1].id, attributedAt: iso(now - 50 * DAY), planCode: null, subscriptionStatus: null },
    { resellerId: laura, userId: dario, email: "dario@example.com", source: "COOKIE", referralCodeId: codes[2].id, attributedAt: iso(now - 30 * DAY), planCode: "STARTER", subscriptionStatus: "ACTIVE" },
  ];
  const paid = id(5, 1);
  const exported = id(5, 2);
  const draft = id(5, 3);
  const entry = (
    index: number,
    resellerId: string,
    customerUserId: string,
    cycleNumber: number,
    amountMinor: number,
    status: CommissionStatus,
    createdDaysAgo: number,
    releaseDaysAgo: number,
    payoutId: string | null = null,
  ): Commission => ({
    id: id(6, index),
    resellerId,
    customerUserId,
    paymentId: id(7, index),
    kind: "ACCRUAL",
    reversesEntryId: null,
    cycleNumber,
    amount: money(amountMinor),
    status,
    releaseAt: iso(now - releaseDaysAgo * DAY),
    payoutId,
    createdAt: iso(now - createdDaysAgo * DAY),
  });
  const commissions: Commission[] = [
    entry(1, north, ana, 3, 1234500, "ACCRUED", 5, 1),
    entry(2, north, bruno, 2, 800000, "ACCRUED", 3, -10),
    entry(3, north, ana, 2, 1234500, "ACCRUED", 35, 20),
    entry(4, north, bruno, 1, 800000, "HELD", 34, 15),
    entry(5, north, carla, 1, 1500000, "APPROVED", 40, 25),
    entry(6, north, ana, 1, 1234500, "PAID", 65, 50, paid),
    entry(7, north, bruno, 1, 600000, "APPROVED", 45, 32, exported),
    entry(8, laura, dario, 1, 500000, "APPROVED", 28, 14, draft),
    entry(9, laura, dario, 2, 500000, "ACCRUED", 2, -12),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const payouts: Payout[] = [
    { id: draft, resellerId: laura, periodEnd: dayOf(now - 10 * DAY), total: money(500000), status: "DRAFT", paidAt: null, transferReference: null, createdAt: iso(now - 9 * DAY) },
    { id: exported, resellerId: north, periodEnd: dayOf(now - 30 * DAY), total: money(600000), status: "EXPORTED", paidAt: null, transferReference: null, createdAt: iso(now - 29 * DAY) },
    { id: paid, resellerId: north, periodEnd: dayOf(now - 48 * DAY), total: money(1234500), status: "PAID", paidAt: iso(now - 45 * DAY), transferReference: "OP-000123", createdAt: iso(now - 47 * DAY) },
  ];
  return { resellers, codes, clicks, customers, commissions, payouts };
}

function reasonOf(body: Record<string, unknown>): string | null {
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  return reason.length > 0 && reason.length <= 500 ? reason : null;
}

const MISSING_REASON = failure(400, "reason: must not be blank");
const NOT_RELEASABLE = failure(409, "The commission can not change from its current status", "COMMISSION_NOT_RELEASABLE");

function text(body: Record<string, unknown>, key: string): string | null {
  const value = body[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function withCodes(reseller: StoredReseller): Reseller {
  const { billing, ...rest } = reseller;
  void billing;
  return { ...rest, codes: state.codes.filter((code) => code.resellerId === reseller.id) };
}

function findReseller(resellerId: string): StoredReseller | undefined {
  return state.resellers.find((reseller) => reseller.id === resellerId);
}

function newCode(): string {
  let code = "";
  for (let index = 0; index < 10; index += 1) code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return code;
}

function inRange(day: string, from: string | null, to: string | null): boolean {
  return (!from || day >= from) && (!to || day <= to);
}

function detail({ match, query, admin }: MockRequest): MockReply {
  const reseller = findReseller(match[1]);
  if (!reseller) return notFound();
  const today = dayOf(Date.now());
  const from = query.get("from") ?? dayOf(Date.now() - 29 * DAY);
  const to = query.get("to") ?? today;
  if (from > to) return failure(400, "The range ends before it starts");
  const finance = hasRole(admin, "FINANCE");
  const codeIds = new Set(state.codes.filter((code) => code.resellerId === reseller.id).map((code) => code.id));
  const totals = new Map<string, number>();
  for (const commission of state.commissions.filter((row) => row.resellerId === reseller.id)) {
    const key = `${commission.status}|${commission.amount.currency}`;
    totals.set(key, (totals.get(key) ?? 0) + commission.amount.amountMinor);
  }
  return ok({
    reseller: withCodes(reseller),
    customersCount: state.customers.filter((customer) => customer.resellerId === reseller.id).length,
    clicks: state.clicks.filter((click) => codeIds.has(click.referralCodeId) && inRange(click.day, from, to)),
    billing: finance ? reseller.billing : null,
    commissionTotals: finance
      ? [...totals.entries()].map(([key, amountMinor]) => {
          const [status, currency] = key.split("|");
          return { status, amount: { amountMinor, currency } };
        })
      : null,
  });
}

function createReseller({ body }: MockRequest): MockReply {
  if (!reasonOf(body)) return MISSING_REASON;
  const userId = text(body, "userId");
  const displayName = text(body, "displayName");
  const legalName = text(body, "legalName");
  const taxId = text(body, "taxId");
  const vatCondition = text(body, "vatCondition");
  if (!userId || !displayName || !legalName || !taxId || !vatCondition) return failure(400, "Missing reseller data");
  if (state.resellers.some((reseller) => reseller.userId === userId)) return failure(409, "The user is already a reseller");
  const reseller: StoredReseller = {
    id: randomUUID(),
    userId,
    displayName,
    status: "ACTIVE",
    rateBps: 5000,
    maxPaidCycles: 6,
    createdAt: iso(Date.now()),
    billing: {
      legalName,
      taxId,
      vatCondition,
      payoutMethod: text(body, "payoutMethod"),
      payoutReference: text(body, "payoutReference"),
      termsVersion: null,
      termsAcceptedAt: null,
    },
  };
  state.resellers.unshift(reseller);
  return { status: 201, body: withCodes(reseller) };
}

function issueCode({ match, body }: MockRequest): MockReply {
  if (!reasonOf(body)) return MISSING_REASON;
  const reseller = findReseller(match[1]);
  if (!reseller) return notFound();
  const code: ReferralCode = { id: randomUUID(), resellerId: reseller.id, code: newCode(), status: "ACTIVE", disabledAt: null, createdAt: iso(Date.now()) };
  state.codes.push(code);
  return { status: 201, body: code };
}

function disableCode({ match, body }: MockRequest): MockReply {
  if (!reasonOf(body)) return MISSING_REASON;
  const code = state.codes.find((candidate) => candidate.id === match[1]);
  if (!code) return notFound();
  if (code.status === "DISABLED") return failure(409, "The code is already disabled");
  code.status = "DISABLED";
  code.disabledAt = iso(Date.now());
  return ok(code);
}

function correctAttribution({ match, body }: MockRequest): MockReply {
  if (!reasonOf(body)) return MISSING_REASON;
  const resellerId = text(body, "resellerId");
  const reseller = resellerId ? findReseller(resellerId) : undefined;
  if (!reseller) return notFound();
  const userId = match[1];
  const previous = state.customers.find((customer) => customer.userId === userId);
  state.customers = state.customers.filter((customer) => customer.userId !== userId);
  const now = iso(Date.now());
  state.customers.unshift({
    resellerId: reseller.id,
    userId,
    email: previous?.email ?? `${userId.slice(0, 8)}@example.com`,
    source: "ADMIN",
    referralCodeId: null,
    attributedAt: now,
    planCode: previous?.planCode ?? null,
    subscriptionStatus: previous?.subscriptionStatus ?? null,
  });
  const attribution: Attribution = { id: randomUUID(), userId, resellerId: reseller.id, referralCodeId: null, source: "ADMIN", sequence: 2, reason: null, createdAt: now };
  return { status: 201, body: attribution };
}

function commissions({ query }: MockRequest): MockReply {
  const statuses = query.getAll("status").filter(Boolean);
  const resellerId = query.get("resellerId");
  const from = query.get("from");
  const to = query.get("to");
  const rows = state.commissions.filter(
    (row) =>
      (statuses.length === 0 || statuses.includes(row.status)) &&
      (!resellerId || row.resellerId === resellerId) &&
      inRange(dayOf(Date.parse(row.createdAt)), from, to),
  );
  return page(rows, query, 100);
}

function findCommission(commissionId: string): Commission | undefined {
  return state.commissions.find((row) => row.id === commissionId);
}

function approve({ body }: MockRequest): MockReply {
  if (!reasonOf(body)) return MISSING_REASON;
  const ids = Array.isArray(body.ids) ? body.ids.filter((value): value is string => typeof value === "string") : [];
  if (ids.length === 0) return failure(400, "Approving needs at least one commission");
  const found = ids.map(findCommission);
  const now = Date.now();
  if (found.some((row) => !row || row.status !== "ACCRUED" || Date.parse(row.releaseAt) > now)) return NOT_RELEASABLE;
  const approved = found.filter((row): row is Commission => Boolean(row));
  for (const row of approved) row.status = "APPROVED";
  return ok(approved);
}

function changeCommission({ match, body }: MockRequest): MockReply {
  if (!reasonOf(body)) return MISSING_REASON;
  const row = findCommission(match[1]);
  if (!row) return notFound();
  const action = match[2];
  if (action === "hold") {
    if (!["ACCRUED", "APPROVED"].includes(row.status) || row.payoutId) return NOT_RELEASABLE;
    row.status = "HELD";
    return ok(row);
  }
  if (action === "release") {
    if (row.status !== "HELD") return NOT_RELEASABLE;
    row.status = "ACCRUED";
    return ok(row);
  }
  if (row.kind !== "ACCRUAL") return NOT_RELEASABLE;
  if (row.status === "REVERSED") return failure(409, "The commission has nothing left to reverse");
  const settled = row.status === "PAID" || row.payoutId !== null;
  const reversal: Commission = {
    ...row,
    id: randomUUID(),
    kind: "REVERSAL",
    reversesEntryId: row.id,
    amount: money(-row.amount.amountMinor),
    status: settled ? "ACCRUED" : "REVERSED",
    releaseAt: iso(Date.now()),
    payoutId: null,
    createdAt: iso(Date.now()),
  };
  if (!settled) row.status = "REVERSED";
  state.commissions.unshift(reversal);
  return ok(reversal);
}

function payouts({ query }: MockRequest): MockReply {
  const resellerId = query.get("resellerId");
  const status = query.get("status");
  return page(
    state.payouts.filter((payout) => (!resellerId || payout.resellerId === resellerId) && (!status || payout.status === status)),
    query,
    100,
  );
}

function findPayout(payoutId: string): Payout | undefined {
  return state.payouts.find((payout) => payout.id === payoutId);
}

function payoutDetail({ match }: MockRequest): MockReply {
  const payout = findPayout(match[1]);
  if (!payout) return notFound();
  const entries = state.commissions.filter((row) => row.payoutId === payout.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return ok({ payout, entries });
}

function createPayout({ body }: MockRequest): MockReply {
  if (!reasonOf(body)) return MISSING_REASON;
  const resellerId = text(body, "resellerId");
  const periodEnd = text(body, "periodEnd");
  const reseller = resellerId ? findReseller(resellerId) : undefined;
  if (!reseller || !periodEnd) return notFound();
  const end = Date.parse(`${periodEnd}T00:00:00-03:00`) + DAY;
  const approved = state.commissions.filter(
    (row) => row.resellerId === reseller.id && row.status === "APPROVED" && row.payoutId === null && Date.parse(row.releaseAt) < end,
  );
  if (approved.length === 0) return failure(409, "There are no approved commissions to pay");
  const total = approved.reduce((sum, row) => sum + row.amount.amountMinor, 0);
  if (total <= 0) return failure(409, "The approved balance is not positive, it carries over to the next payout");
  const payout: Payout = {
    id: randomUUID(),
    resellerId: reseller.id,
    periodEnd,
    total: money(total),
    status: "DRAFT",
    paidAt: null,
    transferReference: null,
    createdAt: iso(Date.now()),
  };
  for (const row of approved) row.payoutId = payout.id;
  state.payouts.unshift(payout);
  return { status: 201, body: payout };
}

const BOM = "\uFEFF";
const LINE_END = "\r\n";
const FORMULA_STARTS = "=+-@\t\r";
const PAYOUT_HEADER = ["Razón social", "CUIT", "Medio de cobro", "Dato de cobro", "Cierre del período", "Total", "Moneda"];
const ENTRY_HEADER = ["Fecha", "Cliente", "Ciclo", "Tipo", "Monto"];

function csvText(value: string | null): string {
  const raw = value ?? "";
  const cell = raw && FORMULA_STARTS.includes(raw[0]) ? `'${raw}` : raw;
  return /[",\r\n]/.test(cell) ? `"${cell.replaceAll('"', '""')}"` : cell;
}

function decimal(amountMinor: number): string {
  return (amountMinor / 100).toFixed(2);
}

function maskedEmail(email: string): string {
  const at = email.indexOf("@");
  return at <= 0 ? "***" : `${email[0]}***${email.slice(at)}`;
}

function customerLabel(customerUserId: string): string {
  const customer = state.customers.find((row) => row.userId === customerUserId);
  return customer ? maskedEmail(customer.email) : "Cliente";
}

function exportPayout({ match, body }: MockRequest): MockReply {
  if (!reasonOf(body)) return MISSING_REASON;
  const payout = findPayout(match[1]);
  if (!payout) return notFound();
  const reseller = findReseller(payout.resellerId);
  if (!reseller) return notFound();
  const rows = [
    PAYOUT_HEADER.map(csvText),
    [
      csvText(reseller.billing.legalName),
      csvText(reseller.billing.taxId),
      csvText(reseller.billing.payoutMethod),
      csvText(reseller.billing.payoutReference),
      payout.periodEnd,
      decimal(payout.total.amountMinor),
      payout.total.currency,
    ],
    ENTRY_HEADER.map(csvText),
    ...state.commissions
      .filter((row) => row.payoutId === payout.id)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
      .map((row) => [dayOf(Date.parse(row.createdAt)), csvText(customerLabel(row.customerUserId)), String(row.cycleNumber), row.kind, decimal(row.amount.amountMinor)]),
  ];
  if (payout.status === "DRAFT") payout.status = "EXPORTED";
  const fileName = `liquidacion-${payout.periodEnd}-${payout.id}.csv`;
  return {
    status: 200,
    text: BOM + rows.map((cells) => cells.join(",") + LINE_END).join(""),
    headers: { "Content-Type": "text/csv;charset=UTF-8", "Content-Disposition": `attachment; filename="${fileName}"` },
  };
}

function markPaid({ match, body }: MockRequest): MockReply {
  if (!reasonOf(body)) return MISSING_REASON;
  const payout = findPayout(match[1]);
  if (!payout) return notFound();
  if (payout.status !== "EXPORTED") return failure(409, "Only an exported payout can be marked paid");
  payout.status = "PAID";
  payout.paidAt = iso(Date.now());
  payout.transferReference = text(body, "transferReference");
  for (const row of state.commissions) if (row.payoutId === payout.id) row.status = "PAID";
  return ok(payout);
}

const SEGMENT = "([^/]+)";

export const referrals: MockArea = {
  reset: ({ scenario, now }) => {
    state = scenario === "referrals" ? seeded(now.getTime()) : empty();
  },
  routes: [
    {
      method: "GET",
      pattern: /^\/admin\/resellers$/,
      access: "ANY",
      handle: ({ query }) => page(state.resellers.map(withCodes), query, 50),
    },
    { method: "GET", pattern: new RegExp(`^/admin/resellers/${SEGMENT}$`), access: "ANY", handle: detail },
    {
      method: "GET",
      pattern: new RegExp(`^/admin/resellers/${SEGMENT}/customers$`),
      access: "ANY",
      handle: ({ match, query }) => {
        if (!findReseller(match[1])) return notFound();
        const rows = state.customers.filter((customer) => customer.resellerId === match[1]).map(({ resellerId, ...customer }) => {
          void resellerId;
          return customer;
        });
        return page(rows, query, 50);
      },
    },
    { method: "POST", pattern: /^\/admin\/resellers$/, access: ["OWNER"], handle: createReseller },
    { method: "POST", pattern: new RegExp(`^/admin/resellers/${SEGMENT}/codes$`), access: ["OWNER"], handle: issueCode },
    { method: "POST", pattern: new RegExp(`^/admin/referral-codes/${SEGMENT}/disable$`), access: ["OWNER"], handle: disableCode },
    { method: "POST", pattern: new RegExp(`^/admin/customers/${SEGMENT}/attribution$`), access: ["OWNER"], handle: correctAttribution },
    { method: "GET", pattern: /^\/admin\/commissions$/, access: ["FINANCE"], handle: commissions },
    { method: "POST", pattern: /^\/admin\/commissions\/approve$/, access: ["FINANCE"], handle: approve },
    { method: "POST", pattern: new RegExp(`^/admin/commissions/${SEGMENT}/(hold|release|reverse)$`), access: ["FINANCE"], handle: changeCommission },
    { method: "GET", pattern: /^\/admin\/payouts$/, access: ["FINANCE"], handle: payouts },
    { method: "POST", pattern: /^\/admin\/payouts$/, access: ["FINANCE"], handle: createPayout },
    { method: "GET", pattern: new RegExp(`^/admin/payouts/${SEGMENT}$`), access: ["FINANCE"], handle: payoutDetail },
    { method: "POST", pattern: new RegExp(`^/admin/payouts/${SEGMENT}/export$`), access: ["FINANCE"], handle: exportPayout },
    { method: "POST", pattern: new RegExp(`^/admin/payouts/${SEGMENT}/paid$`), access: ["FINANCE"], handle: markPaid },
  ],
};
