import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ACCOUNT_FEATURES_OFF, agentApi, agentApiUrl, api, apiUrl, onEmailNotVerified, onPlanError } from "./client";
import { clearQueryCache, fetchQuery, getQueryState } from "../data/queryCache";

const fetchMock = vi.fn<typeof fetch>();

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  clearQueryCache();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("API origins", () => {
  it("uses the dev proxies when no origin is configured", () => {
    vi.stubEnv("VITE_API_BASE_URL", "");
    vi.stubEnv("VITE_AGENT_API_BASE_URL", "");
    expect(apiUrl("/leads")).toBe("/api/leads");
    expect(agentApiUrl("/agents")).toBe("/agent-api/agents");
  });

  it("uses each configured origin without a trailing slash", () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com/");
    vi.stubEnv("VITE_AGENT_API_BASE_URL", "https://agent.example.com");
    expect(apiUrl("leads")).toBe("https://api.example.com/leads");
    expect(agentApiUrl("/agents")).toBe("https://agent.example.com/agents");
  });
});

describe("agentApi", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com");
    vi.stubEnv("VITE_AGENT_API_BASE_URL", "https://agent.example.com");
  });

  it("sends the session cookie and the CSRF header to the agent origin", async () => {
    fetchMock.mockResolvedValue(json({ id: "a-1" }));

    await agentApi.put("/agents/a-1", { name: "Ventas" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://agent.example.com/agents/a-1");
    expect(init).toMatchObject({ method: "PUT", credentials: "include" });
    expect(init?.headers).toMatchObject({ "X-Requested-With": "boxlead-web", "Content-Type": "application/json" });
    expect(init?.body).toBe(JSON.stringify({ name: "Ventas" }));
  });

  it("reads the message of an error response", async () => {
    fetchMock.mockResolvedValue(json({ error: "Agent not found", message: "Agent not found" }, 404));

    await expect(agentApi.get("/agents")).rejects.toMatchObject({ status: 404, message: "Agent not found" });
  });

  it("returns nothing for a 204", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(agentApi.delete("/agents/a-1")).resolves.toBeUndefined();
  });

  it("keeps core requests on the core origin", async () => {
    fetchMock.mockResolvedValue(json([]));

    await api.get("/categories");

    expect(fetchMock.mock.calls[0][0]).toBe("https://api.example.com/categories");
  });
});

describe("query cache origins", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com");
    vi.stubEnv("VITE_AGENT_API_BASE_URL", "https://agent.example.com");
  });

  it("loads prefixed keys from the agent service and plain keys from core", async () => {
    fetchMock.mockImplementation((url) => Promise.resolve(json({ from: String(url) })));

    await fetchQuery("agent:/agents");
    await fetchQuery("/agents");

    expect(getQueryState("agent:/agents").data).toEqual({ from: "https://agent.example.com/agents" });
    expect(getQueryState("/agents").data).toEqual({ from: "https://api.example.com/agents" });
  });
});

describe("session user", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com");
  });

  it("keeps a trimmed name and drops a blank one", async () => {
    fetchMock.mockResolvedValueOnce(json({ userId: "u-1", email: "ana@example.com", name: " Ana Pérez " }));
    await expect(api.me()).resolves.toMatchObject({ userId: "u-1", email: "ana@example.com", name: "Ana Pérez" });

    fetchMock.mockResolvedValueOnce(json({ userId: "u-1", email: "ana@example.com", name: "  " }));
    await expect(api.me()).resolves.toMatchObject({ userId: "u-1", email: "ana@example.com", name: null });

    fetchMock.mockResolvedValueOnce(json({ userId: "u-1", email: "ana@example.com" }));
    await expect(api.me()).resolves.toMatchObject({ userId: "u-1", email: "ana@example.com", name: null });
  });

  it("treats every feature as off when core does not send them yet", async () => {
    fetchMock.mockResolvedValueOnce(json({ userId: "u-1", email: "ana@example.com", name: "Ana" }));
    await expect(api.me()).resolves.toEqual({
      userId: "u-1",
      email: "ana@example.com",
      name: "Ana",
      features: { billing: false, referrals: false, legal: false, clientErrors: false, onboarding: false, notifications: false },
      access: "FULL",
      isReseller: false,
      pendingLegal: [],
      account: ACCOUNT_FEATURES_OFF,
      emailVerificationPending: false,
    });
  });

  it("keeps the features, access, reseller flag and pending legal versions from core", async () => {
    fetchMock.mockResolvedValueOnce(
      json({
        userId: "u-1",
        email: "ana@example.com",
        name: "Ana",
        features: { billing: true, referrals: true, legal: true, clientErrors: true, onboarding: true, notifications: true },
        access: "RESTRICTED",
        isReseller: true,
        pendingLegal: [{ kind: "TERMS", version: "2026-11" }],
      }),
    );
    await expect(api.me()).resolves.toMatchObject({
      features: { billing: true, referrals: true, legal: true, clientErrors: true, onboarding: true, notifications: true },
      access: "RESTRICTED",
      isReseller: true,
      pendingLegal: [{ kind: "TERMS", version: "2026-11" }],
    });
  });

  it("reads anything unexpected as off", async () => {
    fetchMock.mockResolvedValueOnce(
      json({
        userId: "u-1",
        email: "ana@example.com",
        features: { billing: "true", referrals: 1, legal: "yes", clientErrors: "true", onboarding: 1, notifications: "true" },
        access: "ADMIN",
        isReseller: "yes",
        pendingLegal: [{ kind: "COOKIES", version: "1" }, { kind: "PRIVACY" }, "TERMS", { kind: "PRIVACY", version: "2026-11", extra: 1 }],
      }),
    );
    await expect(api.me()).resolves.toMatchObject({
      features: { billing: false, referrals: false, legal: false, clientErrors: false, onboarding: false, notifications: false },
      access: "FULL",
      isReseller: false,
      pendingLegal: [{ kind: "PRIVACY", version: "2026-11" }],
    });

    fetchMock.mockResolvedValueOnce(json({ userId: "u-1", email: "ana@example.com", features: null, pendingLegal: {} }));
    await expect(api.me()).resolves.toMatchObject({
      features: { billing: false, referrals: false, legal: false, clientErrors: false, onboarding: false, notifications: false },
      pendingLegal: [],
    });
  });
});

describe("rate limited answers", () => {
  it("explains a 429 in Spanish whatever the server says", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com");
    fetchMock.mockResolvedValue(json({ error: "Too many requests", message: "Too many requests" }, 429));

    await expect(api.post("/auth/login", {})).rejects.toMatchObject({
      status: 429,
      message: expect.stringContaining("demasiados intentos"),
    });
  });
});

describe("coded errors", () => {
  it("asks to accept the legal documents in Spanish", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com");
    fetchMock.mockResolvedValue(
      json({ error: "Bad Request", message: "Legal documents not accepted", code: "LEGAL_ACCEPTANCE_REQUIRED" }, 400),
    );

    await expect(api.post("/auth/register", {})).rejects.toMatchObject({
      status: 400,
      message: expect.stringContaining("aceptar los términos"),
    });
  });

  it("explains a social login on a password account in Spanish", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com");
    fetchMock.mockResolvedValue(
      json(
        {
          error: "Conflict",
          message: "An account with a password already uses this email",
          code: "ACCOUNT_EXISTS_WITH_PASSWORD",
        },
        409,
      ),
    );

    await expect(api.post("/auth/social", {})).rejects.toMatchObject({
      status: 409,
      message: "Ya tenés una cuenta con este email. Entrá con tu email y contraseña.",
    });
  });
});

describe("plan errors", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com");
    vi.stubEnv("VITE_AGENT_API_BASE_URL", "https://agent.example.com");
  });

  it("explains a 402 in Spanish and tells the listeners which limit it was", async () => {
    const listener = vi.fn();
    const stop = onPlanError(listener);
    fetchMock.mockResolvedValue(json({ error: "Payment Required", message: "Limit", code: "PLAN_LIMIT_REACHED" }, 402));

    await expect(agentApi.post("/agents", {})).rejects.toMatchObject({ status: 402, message: "Llegaste al límite de tu plan." });
    expect(listener).toHaveBeenCalledWith("PLAN_LIMIT_REACHED", "/agents");

    stop();
    fetchMock.mockResolvedValue(json({ error: "Payment Required", message: "Plan", code: "PLAN_REQUIRED" }, 402));
    await expect(api.post("/conversations/c-1/messages", {})).rejects.toMatchObject({
      message: "Necesitás un plan activo para hacer esto.",
    });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("does not report other errors as plan errors", async () => {
    const listener = vi.fn();
    const stop = onPlanError(listener);
    fetchMock.mockResolvedValue(json({ error: "Unavailable", message: "Down", code: "ENTITLEMENTS_UNAVAILABLE" }, 503));

    await expect(agentApi.post("/agents", {})).rejects.toMatchObject({
      status: 503,
      message: "No pudimos revisar tu plan. Probá de nuevo en unos minutos.",
    });
    expect(listener).not.toHaveBeenCalled();
    stop();
  });
});

describe("reports", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com");
  });

  it("posts with keepalive, the session cookie and the CSRF header", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(api.report("/client-errors", { kind: "error" })).resolves.toBeUndefined();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.example.com/client-errors");
    expect(init).toMatchObject({ method: "POST", credentials: "include", keepalive: true });
    expect(init?.headers).toMatchObject({ "X-Requested-With": "boxlead-web", "Content-Type": "application/json" });
  });

  it("rejects with the status and leaves the session alone when it is gone", async () => {
    sessionStorage.setItem("boxlead.test", "1");
    fetchMock.mockResolvedValue(json({ message: "Unauthorized" }, 401));

    await expect(api.report("/client-errors", {})).rejects.toMatchObject({ status: 401 });
    expect(sessionStorage.getItem("boxlead.test")).toBe("1");
    sessionStorage.clear();
  });

  it("keeps regular requests without keepalive", async () => {
    fetchMock.mockResolvedValue(json([]));

    await api.get("/leads");

    expect(fetchMock.mock.calls[0][1]).toMatchObject({ keepalive: false });
  });
});

describe("account fields of the session", () => {
  it("reads the account features and the pending email", async () => {
    fetchMock.mockResolvedValueOnce(
      json({
        userId: "u-1",
        email: "ana@negocio.com",
        account: { passwordReset: true, emailVerification: true, settings: "yes" },
        emailVerificationPending: true,
      }),
    );
    const user = await api.me();
    expect(user.account).toEqual({
      sessionRevocation: false,
      passwordReset: true,
      emailVerification: true,
      settings: false,
      deletion: false,
      emailChange: false,
    });
    expect(user.emailVerificationPending).toBe(true);
  });

  it("treats an older session answer as everything off", async () => {
    fetchMock.mockResolvedValueOnce(json({ userId: "u-1", email: "ana@negocio.com" }));
    const user = await api.me();
    expect(user.account?.deletion).toBe(false);
    expect(user.emailVerificationPending).toBe(false);
  });

  it("asks for a new session when the API says the email is not confirmed", async () => {
    const listener = vi.fn();
    const stop = onEmailNotVerified(listener);
    fetchMock.mockResolvedValueOnce(
      json({ error: "Forbidden", message: "Confirm your email first", code: "EMAIL_NOT_VERIFIED" }, 403),
    );
    await expect(api.get("/leads")).rejects.toThrow();
    expect(listener).toHaveBeenCalledTimes(1);
    stop();
  });
});
