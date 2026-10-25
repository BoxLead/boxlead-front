import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "../api/client";
import type { BillingPlan } from "../api/types";
import {
  choiceFromQuery,
  CURRENT_INVITATION_PATH,
  LEGAL_DOCUMENTS_PATH,
  loadSignupOptions,
  PLANS_PATH,
  SIGNUP_OPTIONS_OFF,
  signupDestination,
  signupPlans,
  type InvitationCheck,
} from "./plans";

function plan(code: BillingPlan["code"], overrides: Partial<BillingPlan> = {}): BillingPlan {
  return {
    code,
    name: code,
    versionId: code,
    inviteOnly: false,
    price: { amountMinor: 6000, currency: "USD" },
    chargeToday: { amountMinor: 8700000, currency: "ARS" },
    frequencyMonths: 1,
    priceIncludesVat: true,
    limits: {},
    ...overrides,
  };
}

const CATALOG = [
  plan("STARTER"),
  plan("BUSINESS"),
  plan("ENTERPRISE", { contactOnly: true, price: null, chargeToday: null }),
  plan("DEMO", { inviteOnly: true, price: null, chargeToday: null }),
];

const INVITED: InvitationCheck = { status: "valid", invitation: { email: "ana@negocio.com", expiresAt: "2026-11-01T00:00:00Z" } };
const NOT_INVITED: InvitationCheck = { status: "none" };

describe("signupDestination", () => {
  it("sends a paid plan to its checkout", () => {
    expect(signupDestination("STARTER", "/app/inbox")).toBe("/app/billing?checkout=STARTER");
    expect(signupDestination("BUSINESS", "/app/leads")).toBe("/app/billing?checkout=BUSINESS");
  });

  it("sends the beta and a sign up without plans to the saved page", () => {
    expect(signupDestination("DEMO", "/app/inbox")).toBe("/app/inbox");
    expect(signupDestination(null, "/app/leads?status=NEW")).toBe("/app/leads?status=NEW");
  });
});

describe("signupPlans", () => {
  it("splits the plans to pick, the beta and the ones that need a talk", () => {
    const plans = signupPlans(CATALOG);
    expect(plans?.paid.map((item) => item.code)).toEqual(["STARTER", "BUSINESS"]);
    expect(plans?.beta?.code).toBe("DEMO");
    expect(plans?.contact.map((item) => item.code)).toEqual(["ENTERPRISE"]);
  });

  it("reads anything but a list as no plans", () => {
    expect(signupPlans({ error: "Not found" })).toBeNull();
    expect(signupPlans([{ code: "GOLD", name: "Gold" }])).toEqual({ paid: [], beta: null, contact: [] });
  });
});

describe("choiceFromQuery", () => {
  const plans = signupPlans(CATALOG)!;

  it("preselects a paid plan from the link", () => {
    expect(choiceFromQuery("STARTER", plans, NOT_INVITED)).toBe("STARTER");
    expect(choiceFromQuery("business", plans, NOT_INVITED)).toBe("BUSINESS");
  });

  it("only preselects the beta with an invitation", () => {
    expect(choiceFromQuery("DEMO", plans, NOT_INVITED)).toBeNull();
    expect(choiceFromQuery("DEMO", plans, INVITED)).toBe("DEMO");
    expect(choiceFromQuery(null, plans, INVITED)).toBe("DEMO");
  });

  it("ignores plans that cannot be picked", () => {
    expect(choiceFromQuery("ENTERPRISE", plans, NOT_INVITED)).toBeNull();
    expect(choiceFromQuery("FREE", plans, NOT_INVITED)).toBeNull();
    expect(choiceFromQuery(null, plans, NOT_INVITED)).toBeNull();
  });
});

describe("loadSignupOptions", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  function answer(responses: Record<string, unknown>) {
    vi.spyOn(api, "get").mockImplementation((path: string) => {
      const response = responses[path];
      return response instanceof Error ? Promise.reject(response) : Promise.resolve(response);
    });
  }

  it("loads the plans, the invitation and the legal versions together", async () => {
    answer({
      [PLANS_PATH]: CATALOG,
      [CURRENT_INVITATION_PATH]: INVITED.status === "valid" ? INVITED.invitation : null,
      [LEGAL_DOCUMENTS_PATH]: [
        { kind: "TERMS", version: "2026-11", url: "/terminos", requiresAcceptance: true },
        { kind: "PRIVACY", version: "2026-11", url: "/privacidad", requiresAcceptance: true },
      ],
    });
    const options = await loadSignupOptions();
    expect(options.plans?.paid).toHaveLength(2);
    expect(options.invitation).toEqual(INVITED);
    expect(options.legal?.versions).toHaveLength(2);
  });

  it("treats every failure as the sign up of today", async () => {
    answer({
      [PLANS_PATH]: new ApiError("Unauthorized", 401),
      [CURRENT_INVITATION_PATH]: new ApiError("Not found", 404),
      [LEGAL_DOCUMENTS_PATH]: new ApiError("Server error", 500),
    });
    expect(await loadSignupOptions()).toEqual(SIGNUP_OPTIONS_OFF);
  });

  it("tells a missing invitation apart from one that could not be checked", async () => {
    answer({
      [PLANS_PATH]: CATALOG,
      [CURRENT_INVITATION_PATH]: new ApiError("Server error", 503),
      [LEGAL_DOCUMENTS_PATH]: new ApiError("Not found", 404),
    });
    expect((await loadSignupOptions()).invitation).toEqual({ status: "error" });
  });

  it("gives up on a slow answer and keeps the sign up of today", async () => {
    vi.useFakeTimers();
    vi.spyOn(api, "get").mockReturnValue(new Promise(() => undefined));
    const options = loadSignupOptions(100);
    await vi.advanceTimersByTimeAsync(100);
    expect(await options).toEqual(SIGNUP_OPTIONS_OFF);
  });
});
