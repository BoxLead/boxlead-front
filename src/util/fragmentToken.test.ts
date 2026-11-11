import { afterEach, describe, expect, it } from "vitest";
import { ApiError } from "../api/client";
import { holdFragmentToken, isInvalidLink, isRateLimited, readFragmentToken, takeFragmentToken } from "./fragmentToken";

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

describe("holdFragmentToken", () => {
  afterEach(() => {
    takeFragmentToken();
    window.history.replaceState(null, "", "/");
  });

  it("moves the token of a token page from the address into memory", () => {
    window.history.replaceState({ key: "k" }, "", "/nueva-clave?x=1#secreto");
    holdFragmentToken();
    expect(window.location.hash).toBe("");
    expect(window.location.search).toBe("?x=1");
    expect(window.history.state).toEqual({ key: "k" });
    expect(takeFragmentToken()).toBe("secreto");
    expect(takeFragmentToken()).toBeNull();
  });

  it("leaves the fragment of any other page in place", () => {
    window.history.replaceState(null, "", "/whatsapp#precios");
    holdFragmentToken();
    expect(window.location.hash).toBe("#precios");
    expect(takeFragmentToken()).toBeNull();
  });

  it("only hands the token to the page it came with", () => {
    window.history.replaceState(null, "", "/invitacion#secreto");
    holdFragmentToken();
    window.history.replaceState(null, "", "/confirmar-email");
    expect(takeFragmentToken()).toBeNull();
  });

  it("reads the fragment of a token page reached without a reload", () => {
    window.history.replaceState(null, "", "/nuevo-email#otro");
    expect(takeFragmentToken()).toBe("otro");
    expect(window.location.hash).toBe("");
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
