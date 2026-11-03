import { afterEach, describe, expect, it, vi } from "vitest";
import { isWhatsAppSignupEvent, launchWhatsAppSignup, whatsAppSignupOutcome, type WhatsAppSignupEvent } from "./facebook-sdk";

function event(name: string, data: WhatsAppSignupEvent["data"]): WhatsAppSignupEvent {
  return { type: "WA_EMBEDDED_SIGNUP", event: name, data };
}

describe("whatsAppSignupOutcome", () => {
  it("takes the number and the account from a finished Cloud API flow", () => {
    expect(whatsAppSignupOutcome(event("FINISH", { phone_number_id: "pn-1", waba_id: "waba-1", business_id: "b-1" })))
      .toEqual({ kind: "number", phoneNumberId: "pn-1", wabaId: "waba-1", phoneNumberRegistered: false });
  });

  it("marks a number that already runs on the WhatsApp Business app as registered", () => {
    expect(whatsAppSignupOutcome(event("FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING", { phone_number_id: "pn-1", waba_id: "waba-1" })))
      .toMatchObject({ kind: "number", phoneNumberRegistered: true });
  });

  it("accepts a WhatsApp Business app account that comes without the number id", () => {
    expect(whatsAppSignupOutcome(event("FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING", { waba_id: "waba-1" })))
      .toEqual({ kind: "number", phoneNumberId: undefined, wabaId: "waba-1", phoneNumberRegistered: true });
  });

  it("reports a flow that finished without a number", () => {
    expect(whatsAppSignupOutcome(event("FINISH_ONLY_WABA", { waba_id: "waba-1" }))).toEqual({ kind: "no-number" });
  });

  it("reports the error Meta described", () => {
    expect(whatsAppSignupOutcome(event("ERROR", { error_message: "Something failed", error_code: "524126", session_id: "s" })))
      .toEqual({ kind: "error", message: "Something failed (524126)" });
  });

  it("is missing when nothing arrived, the flow was cancelled or the ids are absent", () => {
    expect(whatsAppSignupOutcome(null)).toEqual({ kind: "missing" });
    expect(whatsAppSignupOutcome(event("CANCEL", { current_step: "PHONE_NUMBER_SETUP" }))).toEqual({ kind: "missing" });
    expect(whatsAppSignupOutcome(event("FINISH", { waba_id: "waba-1" }))).toEqual({ kind: "missing" });
  });
});

describe("isWhatsAppSignupEvent", () => {
  it("accepts only Embedded Signup session messages", () => {
    expect(isWhatsAppSignupEvent({ type: "WA_EMBEDDED_SIGNUP", event: "FINISH", data: {} })).toBe(true);
    expect(isWhatsAppSignupEvent({ type: "OTHER", event: "FINISH" })).toBe(false);
    expect(isWhatsAppSignupEvent("WA_EMBEDDED_SIGNUP")).toBe(false);
    expect(isWhatsAppSignupEvent(null)).toBe(false);
  });
});

describe("launchWhatsAppSignup", () => {
  afterEach(() => {
    delete window.FB;
  });

  it("asks Meta to onboard the existing WhatsApp Business app", async () => {
    const login = vi.fn((callback: (response: { authResponse?: { code: string } }) => void) => {
      callback({ authResponse: { code: "signup-code" } });
    });
    window.FB = { init: vi.fn(), login };

    await expect(launchWhatsAppSignup("config-1")).resolves.toBe("signup-code");
    expect(login).toHaveBeenCalledWith(expect.any(Function), {
      config_id: "config-1",
      response_type: "code",
      override_default_response_type: true,
      extras: {
        version: "v4",
        setup: {},
        featureType: "whatsapp_business_app_onboarding",
        sessionInfoVersion: "3",
      },
    });
  });
});
