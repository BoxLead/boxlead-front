import { afterEach, describe, expect, it, vi } from "vitest";
import { json, mockFetch } from "../test/fetch";
import { adminApi, connectSession, entryApi, type SessionHooks } from "./client";
import { AdminApiError, ConnectionLostError, messageFor } from "./errors";

const SESSION_REQUIRED = json(401, { error: "Unauthorized", message: "An admin session is required", code: "ADMIN_SESSION_REQUIRED" });

function hooks(overrides: Partial<SessionHooks> = {}) {
  const value: SessionHooks = {
    adminSessionRequired: vi.fn(() => Promise.resolve()),
    signedOut: vi.fn(),
    connectionLost: vi.fn(),
    ...overrides,
  };
  return { value, disconnect: connectSession(value) };
}

let disconnect = () => {};

afterEach(() => {
  disconnect();
  vi.unstubAllGlobals();
});

describe("adminApi", () => {
  it("sends the session cookie and the CSRF header to the API", async () => {
    const calls = mockFetch(() => json(200, { items: [] }));
    await adminApi.get("/admin/payments", { query: new URLSearchParams("status=APPROVED") });
    expect(calls[0].url.toString()).toBe("http://localhost:8080/admin/payments?status=APPROVED");
    expect(calls[0].init.credentials).toBe("include");
    expect(calls[0].init.headers).toMatchObject({ "X-Requested-With": "boxlead-web" });
  });

  it("asks for the code once and retries the request when the admin session expired", async () => {
    const session = hooks();
    disconnect = session.disconnect;
    let first = true;
    const calls = mockFetch(() => {
      if (first) {
        first = false;
        return SESSION_REQUIRED;
      }
      return json(200, { ok: true });
    });
    await expect(adminApi.post("/admin/refunds/1/retry", { reason: "Mercado Pago no respondió" })).resolves.toEqual({ ok: true });
    expect(session.value.adminSessionRequired).toHaveBeenCalledTimes(1);
    expect(calls).toHaveLength(2);
    expect(calls[1].init.body).toBe(JSON.stringify({ reason: "Mercado Pago no respondió" }));
  });

  it("gives up when the code is canceled or the retry fails again", async () => {
    const session = hooks({ adminSessionRequired: vi.fn(() => Promise.reject(new Error("canceled"))) });
    disconnect = session.disconnect;
    mockFetch(() => SESSION_REQUIRED);
    await expect(adminApi.get("/admin/overview")).rejects.toMatchObject({ code: "ADMIN_SESSION_REQUIRED", status: 401 });
    disconnect();

    const again = hooks();
    disconnect = again.disconnect;
    const calls = mockFetch(() => SESSION_REQUIRED);
    await expect(adminApi.get("/admin/overview")).rejects.toBeInstanceOf(AdminApiError);
    expect(calls).toHaveLength(2);
  });

  it("signs out when the customer session is gone", async () => {
    const session = hooks();
    disconnect = session.disconnect;
    mockFetch(() => json(401, { error: "Unauthorized", message: "Unauthorized" }));
    await expect(adminApi.get("/admin/overview")).rejects.toMatchObject({ status: 401 });
    expect(session.value.signedOut).toHaveBeenCalled();
    expect(session.value.adminSessionRequired).not.toHaveBeenCalled();
  });

  it("reports a request that fails without an answer", async () => {
    const session = hooks();
    disconnect = session.disconnect;
    mockFetch(() => new TypeError("Failed to fetch"));
    await expect(adminApi.get("/admin/overview")).rejects.toBeInstanceOf(ConnectionLostError);
    expect(session.value.connectionLost).toHaveBeenCalled();
  });

  it("turns error codes into Spanish messages", async () => {
    mockFetch(() => json(409, { error: "Conflict", message: "The invitation is already closed", code: "INVITATION_CLOSED" }));
    await expect(adminApi.post("/admin/invitations/1/revoke")).rejects.toMatchObject({
      message: "La invitación ya está cerrada.",
      code: "INVITATION_CLOSED",
    });
  });
});

describe("entryApi", () => {
  it("leaves a connection failure to the entry screens instead of the reload notice", async () => {
    const session = hooks();
    disconnect = session.disconnect;
    mockFetch(() => new TypeError("Failed to fetch"));
    await expect(entryApi.me()).rejects.toBeInstanceOf(ConnectionLostError);
    expect(session.value.connectionLost).not.toHaveBeenCalled();
  });

  it("leaves the entry errors to the screens", async () => {
    const session = hooks();
    disconnect = session.disconnect;
    mockFetch(() => json(401, { error: "Unauthorized", message: "The code is not valid", code: "MFA_INVALID" }));
    await expect(entryApi.openSession("000000")).rejects.toMatchObject({ code: "MFA_INVALID" });
    expect(session.value.signedOut).not.toHaveBeenCalled();
    expect(session.value.adminSessionRequired).not.toHaveBeenCalled();
  });
});

describe("messageFor", () => {
  it.each([
    "DEMO_ALREADY_USED",
    "SUBSCRIPTION_NOT_ACTIVE",
    "RESELLER_EXISTS",
    "INVOICE_NUMBER_TAKEN",
    "PAYOUT_NOTHING_TO_PAY",
    "PAYOUT_MIXED_CURRENCIES",
    "PAYOUT_NOT_POSITIVE",
    "COMMISSION_NOTHING_TO_REVERSE",
    "CONCURRENT_CHANGE",
    "INVITATION_RESELLER_INVALID",
    "SUBSCRIPTION_CHANGED",
    "REFUND_ALREADY_ANSWERED",
    "INVOICE_NOT_ISSUED",
  ])("has its own message for %s instead of the status fallback", (code) => {
    expect(messageFor(409, code)).not.toBe(messageFor(409, null));
    expect(messageFor(409, code)).not.toBe(messageFor(500, null));
  });
});
