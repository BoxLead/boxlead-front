import { describe, expect, it, vi } from "vitest";
import {
  beginOAuthRedirect,
  consumeOAuthSession,
  isFacebookOrigin,
  redirectUriFor,
} from "./oauth";

describe("beginOAuthRedirect", () => {
  it("adds a state, stores it with the PKCE verifier and navigates", () => {
    const navigate = vi.fn();
    beginOAuthRedirect("https://auth.mercadolibre.com.ar/authorization?client_id=1", "verifier", navigate);

    const target = new URL(navigate.mock.calls[0][0]);
    const state = target.searchParams.get("state");
    expect(state).toBeTruthy();
    expect(target.searchParams.get("client_id")).toBe("1");
    expect(consumeOAuthSession(state)).toEqual({ valid: true, codeVerifier: "verifier" });
  });

  it("keeps a state already present in the provider URL", () => {
    const navigate = vi.fn();
    beginOAuthRedirect("https://www.facebook.com/dialog/oauth?state=abc", undefined, navigate);
    expect(navigate).toHaveBeenCalledWith("https://www.facebook.com/dialog/oauth?state=abc");
    expect(consumeOAuthSession("abc")).toEqual({ valid: true, codeVerifier: undefined });
  });

  it("refuses non https authorization URLs", () => {
    const navigate = vi.fn();
    expect(() => beginOAuthRedirect("http://evil.test/authorize", undefined, navigate)).toThrow();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("drops a verifier left by a previous flow", () => {
    beginOAuthRedirect("https://a.test/?state=one", "old", vi.fn());
    beginOAuthRedirect("https://a.test/?state=two", undefined, vi.fn());
    expect(consumeOAuthSession("two").codeVerifier).toBeUndefined();
  });
});

describe("consumeOAuthSession", () => {
  it("rejects a missing or different state and clears the session either way", () => {
    beginOAuthRedirect("https://a.test/?state=expected", "v", vi.fn());
    expect(consumeOAuthSession("forged").valid).toBe(false);
    expect(consumeOAuthSession("expected").valid).toBe(false);
  });

  it("rejects when no flow was started", () => {
    expect(consumeOAuthSession(null).valid).toBe(false);
  });
});

describe("isFacebookOrigin", () => {
  it.each([
    ["https://www.facebook.com", true],
    ["https://facebook.com", true],
    ["https://business.facebook.com", true],
    ["http://www.facebook.com", false],
    ["https://facebook.com.evil.test", false],
    ["https://evilfacebook.com", false],
    ["not a url", false],
  ])("%s is %s", (origin, expected) => {
    expect(isFacebookOrigin(origin)).toBe(expected);
  });
});

describe("redirectUriFor", () => {
  it("points to the in-app callback route", () => {
    expect(redirectUriFor("MELI")).toBe(`${window.location.origin}/app/oauth/callback/MELI`);
  });
});
