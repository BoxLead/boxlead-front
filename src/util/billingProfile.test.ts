import { describe, expect, it } from "vitest";
import {
  emptyProfile,
  formatCuit,
  isValidCuit,
  normalizeProfile,
  serverProfileErrors,
  validateProfile,
  vatConditionLabel,
} from "./billingProfile";

const complete = {
  ...emptyProfile("pagos@negocio.com"),
  taxId: "20-12345678-6",
  legalName: "Negocio SRL",
  vatCondition: "RESPONSABLE_INSCRIPTO",
  addressLine: "Calle 1",
  city: "Rosario",
  province: "Santa Fe",
  postalCode: "2000",
};

describe("isValidCuit", () => {
  it.each(["20123456786", "20-12345678-6", "20 12345678 6", "30-71234567-1", "27-00000001-4"])("accepts %s", (value) => {
    expect(isValidCuit(value)).toBe(true);
  });

  it.each(["20123456789", "2012345678", "201234567861", "20-1234567A-6", "", "abc"])("rejects %s", (value) => {
    expect(isValidCuit(value)).toBe(false);
  });

  it("rejects a number whose check digit would be 10", () => {
    expect(isValidCuit("20000000010")).toBe(false);
  });
});

describe("billing profile", () => {
  it("formats the CUIT with dashes", () => {
    expect(formatCuit("20123456786")).toBe("20-12345678-6");
    expect(formatCuit("123")).toBe("123");
  });

  it("asks for every field", () => {
    const errors = validateProfile(emptyProfile());
    expect(Object.keys(errors).sort()).toEqual(
      ["addressLine", "billingEmail", "city", "legalName", "postalCode", "province", "taxId", "vatCondition"].sort(),
    );
  });

  it("checks the CUIT and the email", () => {
    expect(validateProfile(complete)).toEqual({});
    expect(validateProfile({ ...complete, taxId: "20123456789" })).toEqual({
      taxId: "Revisá el CUIT, el dígito verificador no coincide.",
    });
    expect(validateProfile({ ...complete, billingEmail: "pagos" })).toEqual({ billingEmail: "Escribí un email válido." });
  });

  it("sends the CUIT as digits and trims every field", () => {
    expect(normalizeProfile({ ...complete, legalName: "  Negocio SRL " })).toMatchObject({
      taxId: "20123456786",
      legalName: "Negocio SRL",
    });
  });

  it("explains the server field errors in Spanish", () => {
    expect(
      serverProfileErrors([
        { field: "taxId", message: "invalid CUIT" },
        { field: "city", message: "must not be blank" },
        { field: "unknown", message: "x" },
      ]),
    ).toEqual({ taxId: "Revisá el CUIT, el dígito verificador no coincide.", city: "Revisá este dato." });
  });

  it("names the VAT condition", () => {
    expect(vatConditionLabel("MONOTRIBUTO")).toBe("Monotributo");
    expect(vatConditionLabel("OTRA")).toBe("OTRA");
  });
});
