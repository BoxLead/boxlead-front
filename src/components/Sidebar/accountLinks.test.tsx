import { describe, expect, it } from "vitest";
import { accountLinks, consumerLinks } from "./accountLinks";

const off = { billing: false, referrals: false, legal: false, clientErrors: false, onboarding: false, notifications: false };

describe("account links", () => {
  it("adds nothing while billing, referrals and legal are off", () => {
    expect(accountLinks({ features: off, isReseller: false })).toEqual([]);
    expect(consumerLinks({ features: off })).toEqual([]);
  });

  it("shows billing when core enables billing", () => {
    const features = { ...off, billing: true };
    expect(accountLinks({ features, isReseller: false }).map((link) => link.to)).toEqual(["/app/billing"]);
  });

  it("shows the consumer links when core enables legal, with or without billing", () => {
    expect(consumerLinks({ features: { ...off, legal: true } }).map((link) => link.to)).toEqual(["/arrepentimiento", "/baja"]);
    expect(consumerLinks({ features: { ...off, billing: true } })).toEqual([]);
  });

  it("shows the account page first when core enables it", () => {
    const account = { sessionRevocation: false, passwordReset: false, emailVerification: false, settings: true, deletion: false };
    expect(accountLinks({ features: { ...off, billing: true }, isReseller: false, account }).map((link) => link.to)).toEqual([
      "/app/cuenta",
      "/app/billing",
    ]);
    expect(accountLinks({ features: off, isReseller: false, account: { ...account, settings: false } })).toEqual([]);
  });

  it("shows the reseller page only to resellers", () => {
    const features = { ...off, billing: true, referrals: true };
    expect(accountLinks({ features, isReseller: true }).map((link) => link.label)).toEqual(["Facturación", "Revendedor"]);
    expect(accountLinks({ features, isReseller: false }).map((link) => link.label)).toEqual(["Facturación"]);
  });

  it("links the notifications page only with the notifications flag", () => {
    expect(accountLinks({ features: { ...off, notifications: true }, isReseller: false }).map((link) => link.to)).toEqual([
      "/app/notificaciones",
    ]);
  });
});
