import { describe, expect, it } from "vitest";
import { ApiError } from "../api/client";
import { isInvalidLink, isRateLimited, readFragmentToken } from "./fragmentToken";

describe("readFragmentToken", () => {
  it("reads the token with or without the hash sign", () => {
    expect(readFragmentToken("#abc")).toBe("abc");
    expect(readFragmentToken("abc")).toBe("abc");
  });

  it("gives nothing for an empty fragment", () => {
    expect(readFragmentToken("")).toBeNull();
    expect(readFragmentToken("#  ")).toBeNull();
  });
});

describe("isInvalidLink", () => {
  it("treats an invalid token and a route that is off as an invalid link", () => {
    expect(isInvalidLink(new ApiError("x", 400, { code: "INVALID_TOKEN" }))).toBe(true);
    expect(isInvalidLink(new ApiError("Not found", 404))).toBe(true);
    expect(isInvalidLink(new ApiError("Server error", 500))).toBe(false);
    expect(isInvalidLink(new TypeError("Failed to fetch"))).toBe(false);
  });
});

describe("isRateLimited", () => {
  it("only treats a 429 as too many attempts", () => {
    expect(isRateLimited(new ApiError("x", 429))).toBe(true);
    expect(isRateLimited(new ApiError("x", 500))).toBe(false);
    expect(isRateLimited(new TypeError("Failed to fetch"))).toBe(false);
  });
});
