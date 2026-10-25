import { describe, expect, it } from "vitest";
import { accountLinks, consumerLinks } from "./accountLinks";

const off = { billing: false, referrals: false };

describe("account links", () => {
  it("adds nothing while billing and referrals are off", () => {
    expect(accountLinks({ features: off, isReseller: false })).toEqual([]);
    expect(consumerLinks({ features: off })).toEqual([]);
  });

  it("shows billing and the consumer links when core enables billing", () => {
    const features = { billing: true, referrals: false };
    expect(accountLinks({ features, isReseller: false }).map((link) => link.to)).toEqual(["/app/billing"]);
    expect(consumerLinks({ features }).map((link) => link.to)).toEqual(["/arrepentimiento", "/baja"]);
  });

  it("shows the reseller page only to resellers", () => {
    const features = { billing: true, referrals: true };
    expect(accountLinks({ features, isReseller: true }).map((link) => link.label)).toEqual(["Facturación", "Revendedor"]);
    expect(accountLinks({ features, isReseller: false }).map((link) => link.label)).toEqual(["Facturación"]);
  });
});
