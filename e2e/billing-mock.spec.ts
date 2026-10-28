import type { APIRequestContext } from "@playwright/test";
import type { BillingSummary } from "../src/api/types.ts";
import { INVITATION_TOKENS, LEGAL_VERSION, PROVIDER_DOWN_EMAIL, REFERRAL_CODE } from "./mock-api/billing.ts";
import type { Scenario } from "./mock-api/fixtures.ts";
import { DEMO_EMAIL, DEMO_PASSWORD, expect, mockApiUrl, resetApi, settleCheckout, test } from "./support.ts";

const CSRF = { "X-Requested-With": "boxlead-web" };
const ACCEPTED_FOR_CHECKOUT = ["TERMS", "PRIVACY", "ADHESION_CONTRACT"].map((kind) => ({ kind, version: LEGAL_VERSION }));
const VALID_PROFILE = {
  country: "AR",
  taxIdType: "CUIT",
  taxId: "20-12345678-6",
  legalName: "Negocio SRL",
  vatCondition: "RESPONSABLE_INSCRIPTO",
  addressLine: "Calle 1",
  city: "Rosario",
  province: "Santa Fe",
  postalCode: "2000",
  billingEmail: "pagos@negocio.com",
};

let api: APIRequestContext;

test.beforeEach(async ({ playwright }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "The mock contract does not depend on the viewport");
  api = await playwright.request.newContext({ baseURL: mockApiUrl(), extraHTTPHeaders: CSRF });
});

test.afterEach(async () => {
  await api?.dispose();
});

async function signIn(scenario: Scenario, options = {}) {
  await resetApi(scenario, undefined, options);
  const res = await api.post("/auth/login", { data: { email: DEMO_EMAIL, password: DEMO_PASSWORD } });
  expect(res.ok()).toBe(true);
}

async function summary(): Promise<BillingSummary> {
  const res = await api.get("/billing/summary");
  expect(res.status()).toBe(200);
  return (await res.json()) as BillingSummary;
}

async function expectCode(response: Promise<{ status(): number; json(): Promise<unknown> }>, status: number, code: string) {
  const res = await response;
  expect(res.status()).toBe(status);
  expect(await res.json()).toMatchObject({ code });
}

test("with billing off every new endpoint answers 404 and the session is as today", async () => {
  await signIn("default");
  expect(await (await api.get("/auth/me")).json()).toMatchObject({
    features: { billing: false, referrals: false, legal: false },
    access: "FULL",
    isReseller: false,
    pendingLegal: [],
  });
  for (const path of ["/billing/plans", "/billing/summary", "/billing/payments", "/billing/profile", "/invitations/current", "/referrals/me", "/legal/documents"]) {
    expect((await api.get(path)).status(), path).toBe(404);
  }
  expect((await api.post("/billing/checkout", { data: { planCode: "STARTER", payerEmail: "a@b.com" } })).status()).toBe(404);
  expect((await api.post("/invitations/preview", { data: { token: INVITATION_TOKENS.valid } })).status()).toBe(404);
  expect((await api.post("/consumer-requests", { data: { kind: "CANCELLATION", email: "a@b.com" } })).status()).toBe(404);
  expect((await api.post("/agents", { data: {} })).status()).toBe(422);
  expect((await api.get("/agents")).status()).toBe(200);
});

test("each scenario tells its own state", async () => {
  const expected: [Scenario, Partial<Record<string, unknown>>][] = [
    [
      "billing-none",
      { access: "RESTRICTED", plan: null, subscription: null, demo: null, checkout: null, limits: { METRICS_HISTORY_DAYS: 30 } },
    ],
    ["billing-demo", { access: "FULL", plan: { code: "DEMO", source: "DEMO" }, subscription: null }],
    ["billing-active", { access: "FULL", plan: { code: "STARTER" }, subscription: { status: "ACTIVE", updatePaymentUrl: null } }],
    ["billing-past-due", { access: "FULL", subscription: { status: "PAST_DUE" } }],
    ["billing-suspended", { access: "RESTRICTED", subscription: { status: "SUSPENDED" }, limits: {} }],
    ["billing-checkout-pending", { access: "RESTRICTED", plan: null, checkout: { planCode: "STARTER", status: "PENDING" } }],
    ["billing-checkout-rejected", { checkout: { planCode: "STARTER", status: "REJECTED" } }],
    ["billing-downgrade-pending", { plan: { code: "BUSINESS" }, subscription: { pendingPlanCode: "STARTER" } }],
    ["billing-invited", { access: "RESTRICTED", plan: null }],
    [
      "billing-team",
      { access: "FULL", plan: { code: "BUSINESS", name: "Business", source: "TEAM" }, subscription: { status: "SUSPENDED" }, demo: null },
    ],
    ["reseller", { access: "FULL", plan: { code: "STARTER" } }],
  ];
  for (const [scenario, shape] of expected) {
    await signIn(scenario);
    expect(await summary(), scenario).toMatchObject(shape);
  }

  await signIn("billing-past-due");
  expect((await summary()).subscription?.updatePaymentUrl).toMatch(/^https:\/\/www\.mercadopago\.com\.ar\//);
  await signIn("reseller");
  expect(await (await api.get("/auth/me")).json()).toMatchObject({ features: { billing: true, referrals: true, legal: true }, isReseller: true });
});

test("plans are public and include the invite only Beta", async () => {
  await resetApi("billing-none");
  const plans = (await (await api.get("/billing/plans")).json()) as { code: string; inviteOnly: boolean; price: unknown }[];
  expect(plans.map((plan) => plan.code)).toEqual(["STARTER", "BUSINESS", "ENTERPRISE", "DEMO"]);
  expect(plans.find((plan) => plan.code === "DEMO")).toMatchObject({ inviteOnly: true, price: null });
  expect(plans.find((plan) => plan.code === "ENTERPRISE")).toMatchObject({ contactOnly: true, price: null });
  expect(plans.find((plan) => plan.code === "STARTER")).toMatchObject({
    price: { currency: "USD" },
    chargeToday: { currency: "ARS" },
    fxRate: { source: "BNA_OFICIAL_VENDEDOR" },
  });
  expect((await api.get("/billing/summary")).status()).toBe(401);
});

test("checkout goes to Mercado Pago and the result comes from the server", async () => {
  await signIn("billing-none");
  const checkout = (data: Record<string, unknown>) => api.post("/billing/checkout", { data });
  await expectCode(checkout({ planCode: "STARTER", payerEmail: "pagos@negocio.com" }), 400, "LEGAL_ACCEPTANCE_REQUIRED");
  await expectCode(checkout({ planCode: "STARTER", payerEmail: "pagos@negocio.com", acceptedLegal: ACCEPTED_FOR_CHECKOUT }), 422, "BILLING_PROFILE_REQUIRED");

  const invalid = await api.put("/billing/profile", { data: { ...VALID_PROFILE, taxId: "20123456789" } });
  expect(invalid.status()).toBe(400);
  expect(await invalid.json()).toMatchObject({ fields: [{ field: "taxId" }] });
  expect((await api.put("/billing/profile", { data: VALID_PROFILE })).status()).toBe(200);
  expect(await (await api.get("/billing/profile")).json()).toMatchObject({ taxId: "20123456786" });

  await expectCode(checkout({ planCode: "STARTER", payerEmail: PROVIDER_DOWN_EMAIL, acceptedLegal: ACCEPTED_FOR_CHECKOUT }), 502, "PROVIDER_UNAVAILABLE");
  const first = await checkout({ planCode: "STARTER", payerEmail: "pagos@negocio.com", acceptedLegal: ACCEPTED_FOR_CHECKOUT });
  const { checkoutUrl } = (await first.json()) as { checkoutUrl: string };
  expect(new URL(checkoutUrl).host).toBe("www.mercadopago.com.ar");
  const again = await checkout({ planCode: "STARTER", payerEmail: "pagos@negocio.com", acceptedLegal: ACCEPTED_FOR_CHECKOUT });
  expect(await again.json()).toEqual({ checkoutUrl });
  expect((await summary()).checkout).toEqual({ planCode: "STARTER", status: "WAITING" });

  await settleCheckout("REJECTED");
  expect((await summary()).checkout).toEqual({ planCode: "STARTER", status: "REJECTED" });
  await settleCheckout("APPROVED");
  expect(await summary()).toMatchObject({ access: "FULL", checkout: null, subscription: { status: "ACTIVE" } });
  expect(((await (await api.get("/billing/payments?page=0")).json()) as unknown[]).length).toBe(1);
  await expectCode(checkout({ planCode: "BUSINESS", payerEmail: "pagos@negocio.com", acceptedLegal: ACCEPTED_FOR_CHECKOUT }), 409, "SUBSCRIPTION_EXISTS");
});

test("plan changes follow the contract", async () => {
  await signIn("billing-downgrade-pending");
  const change = (planCode: string) => api.post("/billing/subscription/plan", { data: { planCode } });
  const undone = (await (await change("BUSINESS")).json()) as BillingSummary;
  expect(undone.subscription).toMatchObject({ pendingPlanCode: null, price: { amountMinor: 29000000, currency: "ARS" } });
  await expectCode(change("BUSINESS"), 409, "SAME_PLAN");
  const downgraded = (await (await change("STARTER")).json()) as BillingSummary;
  expect(downgraded).toMatchObject({ plan: { code: "BUSINESS" }, subscription: { pendingPlanCode: "STARTER" } });

  await signIn("billing-active");
  const upgraded = (await (await change("BUSINESS")).json()) as BillingSummary;
  expect(upgraded.plan?.code).toBe("BUSINESS");
  const sameperiod = (await (await change("STARTER")).json()) as BillingSummary;
  expect(sameperiod).toMatchObject({ plan: { code: "STARTER" }, subscription: { pendingPlanCode: null } });
  const canceled = (await (await api.post("/billing/subscription/cancel")).json()) as BillingSummary;
  expect(canceled.subscription?.cancelAtPeriodEnd).toBe(true);
  await expectCode(change("BUSINESS"), 409, "SUBSCRIPTION_CANCELING");

  await signIn("billing-suspended");
  await expectCode(change("BUSINESS"), 409, "SUBSCRIPTION_NOT_ACTIVE");
});

test("invitations set their cookie and explain every refusal", async () => {
  await resetApi("billing-none");
  await expectCode(api.post("/invitations/preview", { data: { token: INVITATION_TOKENS.invalid } }), 410, "INVITATION_INVALID");
  expect((await api.get("/invitations/current")).status()).toBe(404);
  const preview = await api.post("/invitations/preview", { data: { token: INVITATION_TOKENS.otherEmail } });
  expect(preview.status()).toBe(200);
  expect(preview.headers()["set-cookie"]).toContain("HttpOnly");
  expect(await (await api.get("/invitations/current")).json()).toMatchObject({ email: "ana@negocio.com" });
  const login = await api.post("/auth/login", { data: { email: DEMO_EMAIL, password: DEMO_PASSWORD } });
  expect(login.ok()).toBe(true);
  await expectCode(api.post("/invitations/accept"), 403, "INVITATION_EMAIL_MISMATCH");

  await api.post("/invitations/preview", { data: { token: INVITATION_TOKENS.valid } });
  expect(await (await api.post("/invitations/accept")).json()).toMatchObject({ plan: { code: "DEMO" }, demo: {} });
  await expectCode(api.post("/invitations/accept"), 410, "INVITATION_INVALID");

  await signIn("billing-demo");
  await api.post("/invitations/preview", { data: { token: INVITATION_TOKENS.valid } });
  await expectCode(api.post("/invitations/accept"), 409, "DEMO_ALREADY_USED");
});

test("the invited scenario already has the cookie of another email", async () => {
  await signIn("billing-invited");
  expect(await (await api.get("/invitations/current")).json()).toMatchObject({ email: "ana@negocio.com" });
  await expectCode(api.post("/invitations/accept"), 403, "INVITATION_EMAIL_MISMATCH");
});

test("referrals answer only to resellers and the link sets its cookie once", async () => {
  await signIn("billing-active");
  expect((await api.get("/referrals/me")).status()).toBe(404);
  await signIn("reseller");
  expect(await (await api.get("/referrals/me")).json()).toMatchObject({ codes: [{ code: REFERRAL_CODE, status: "ACTIVE" }] });

  const first = await api.get(`/r/${REFERRAL_CODE}`, { maxRedirects: 0 });
  expect(first.status()).toBe(302);
  expect(first.headers().location).toBe("https://boxlead.app/");
  expect(first.headers()["set-cookie"]).toContain(`boxlead_ref=${REFERRAL_CODE}`);
  const second = await api.get(`/r/${REFERRAL_CODE}`, { maxRedirects: 0 });
  expect(second.headers()["set-cookie"]).toBeUndefined();
  const unknown = await api.get("/r/NOPE", { maxRedirects: 0 });
  expect(unknown.status()).toBe(302);
});

test("legal documents, acceptances and consumer requests", async () => {
  await signIn("billing-none", { pendingLegal: true });
  expect(await (await api.get("/legal/documents")).json()).toEqual(
    expect.arrayContaining([expect.objectContaining({ kind: "TERMS", version: LEGAL_VERSION, url: "/terminos" })]),
  );
  expect(((await (await api.get("/auth/me")).json()) as { pendingLegal: unknown[] }).pendingLegal).toHaveLength(2);
  const accepted = await api.post("/legal/acceptances", { data: { acceptedLegal: [{ kind: "TERMS", version: LEGAL_VERSION }, { kind: "PRIVACY", version: LEGAL_VERSION }] } });
  expect(accepted.status()).toBe(204);
  expect(await (await api.get("/auth/me")).json()).toMatchObject({ pendingLegal: [] });

  const request = await api.post("/consumer-requests", { data: { kind: "WITHDRAWAL", email: "ana@negocio.com", details: "Quiero arrepentirme" } });
  expect(request.status()).toBe(202);
  expect(await request.json()).toMatchObject({ code: expect.stringMatching(/^BX-[0-9A-Z]{6}$/) });
  expect((await api.post("/consumer-requests", { data: { kind: "OTHER", email: "x" } })).status()).toBe(400);
  await expectCode(api.post("/auth/register", { data: { email: "nuevo@negocio.com", password: "secreta123" } }), 400, "LEGAL_ACCEPTANCE_REQUIRED");
});

test("agents, playground, manual replies and metrics answer with the plan errors", async () => {
  const agent = { name: "Nuevo", instructions: "Respondé", enabled: false, publicCommentReplies: false, scopes: [{ platform: null, categoryId: null, salesStage: null, replyMode: "DRAFT" }] };
  const playground = { messages: [{ role: "user", content: "Hola" }], state: { platform: "MELI", agent: { name: "Nuevo" } } };

  await signIn("billing-demo");
  const agents = (await (await api.get("/agents")).json()) as { name: string; overPlanLimit?: boolean }[];
  expect(agents.map((item) => item.overPlanLimit ?? false)).toEqual([false, true]);
  await expectCode(api.post("/agents", { data: agent }), 402, "PLAN_LIMIT_REACHED");
  const day = (daysBack: number) => new Date(Date.now() - daysBack * 86_400_000).toISOString().slice(0, 10);
  expect((await api.get(`/metrics?from=${day(20)}&to=${day(0)}&timezone=UTC`)).status()).toBe(200);
  await expectCode(api.get(`/metrics?from=${day(60)}&to=${day(0)}&timezone=UTC`), 402, "PLAN_LIMIT_REACHED");

  await signIn("billing-suspended");
  await expectCode(api.post("/agents", { data: agent }), 402, "PLAN_REQUIRED");
  await expectCode(api.post("/agents/playground", { data: playground }), 402, "PLAN_REQUIRED");
  const conversations = (await (await api.get("/conversations")).json()) as { id: string }[];
  await expectCode(api.post(`/conversations/${conversations[0]?.id}/messages`, { data: { direction: "OUTBOUND", content: "Hola" } }), 402, "PLAN_REQUIRED");

  await signIn("billing-active", { entitlementsUnavailable: true });
  await expectCode(api.post("/agents", { data: agent }), 503, "ENTITLEMENTS_UNAVAILABLE");
});
