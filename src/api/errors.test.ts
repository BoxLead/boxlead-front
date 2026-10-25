import { describe, expect, it } from "vitest";
import { ApiError } from "./client";
import { apiErrorCode, apiFieldErrors } from "./errors";

describe("API error codes", () => {
  it("reads a known code from core or the agent", () => {
    const error = new ApiError("Plan required", 402, { error: "Plan required", message: "Plan required", code: "PLAN_REQUIRED" });
    expect(apiErrorCode(error)).toBe("PLAN_REQUIRED");
  });

  it("ignores unknown codes, bodies without a code and other errors", () => {
    expect(apiErrorCode(new ApiError("x", 409, { code: "SOMETHING_NEW" }))).toBeNull();
    expect(apiErrorCode(new ApiError("x", 404, { error: "Not found", message: "Not found" }))).toBeNull();
    expect(apiErrorCode(new ApiError("x", 500, "Internal"))).toBeNull();
    expect(apiErrorCode(new Error("network"))).toBeNull();
  });
});

describe("API field errors", () => {
  it("keeps the field and message of each validation error", () => {
    const error = new ApiError("Validation failed", 400, {
      error: "Validation failed",
      message: "Validation failed",
      fields: [{ field: "taxId", message: "CUIT inválido" }, { field: "city" }, "postalCode"],
    });
    expect(apiFieldErrors(error)).toEqual([{ field: "taxId", message: "CUIT inválido" }]);
  });

  it("returns nothing when there are no fields", () => {
    expect(apiFieldErrors(new ApiError("x", 400, { error: "x", message: "x" }))).toEqual([]);
    expect(apiFieldErrors(new ApiError("x", 400, { fields: {} }))).toEqual([]);
    expect(apiFieldErrors(null)).toEqual([]);
  });
});
