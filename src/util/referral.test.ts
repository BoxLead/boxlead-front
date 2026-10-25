import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ATTRIBUTION_WINDOW_DAYS,
  captureReferral,
  hasReferralCookie,
  parseReferralCode,
  referralCookie,
  referralCookieDomain,
} from "./referral";

describe("parseReferralCode", () => {
  it.each([
    ["7KX2M9QH4R", "7KX2M9QH4R"],
    ["7kx2m9qh4r", "7KX2M9QH4R"],
    [" 7KX2M9QH4R ", "7KX2M9QH4R"],
    ["0123456789", "0123456789"],
  ])("accepts %s", (value, expected) => {
    expect(parseReferralCode(value)).toBe(expected);
  });

  it.each([
    null,
    "",
    "7KX2M9QH4",
    "7KX2M9QH4RR",
    "7KX2M9QH4I",
    "7KX2M9QH4L",
    "7KX2M9QH4O",
    "7KX2M9QH4U",
    "7KX2-9QH4R",
    "7KX2M9QH4R;",
    "<script>",
  ])("rejects %s", (value) => {
    expect(parseReferralCode(value)).toBeNull();
  });
});

describe("hasReferralCookie", () => {
  it("finds the cookie among others", () => {
    expect(hasReferralCookie("theme=dark; boxlead_ref=7KX2M9QH4R")).toBe(true);
    expect(hasReferralCookie("boxlead_ref=7KX2M9QH4R")).toBe(true);
  });

  it("ignores missing or similar names", () => {
    expect(hasReferralCookie("")).toBe(false);
    expect(hasReferralCookie("theme=dark")).toBe(false);
    expect(hasReferralCookie("old_boxlead_ref=7KX2M9QH4R")).toBe(false);
  });
});

describe("referralCookieDomain", () => {
  it.each([
    ["boxlead.app", ".boxlead.app"],
    ["www.boxlead.app", ".boxlead.app"],
    ["staging.boxlead.app", ".boxlead.app"],
    ["localhost", null],
    ["boxlead.app.evil.test", null],
    ["notboxlead.app", null],
  ])("for %s is %s", (hostname, expected) => {
    expect(referralCookieDomain(hostname)).toBe(expected);
  });
});

describe("referralCookie", () => {
  it("lives for the attribution window on the parent domain", () => {
    expect(referralCookie("7KX2M9QH4R", "boxlead.app")).toBe(
      `boxlead_ref=7KX2M9QH4R; Path=/; Max-Age=${ATTRIBUTION_WINDOW_DAYS * 86_400}; Domain=.boxlead.app; Secure; SameSite=Lax`,
    );
  });

  it("has no domain on other hosts", () => {
    expect(referralCookie("7KX2M9QH4R", "localhost")).not.toContain("Domain=");
  });
});

describe("captureReferral", () => {
  const cookieWrites: string[] = [];
  let currentCookies = "";

  function visit(path: string, cookies = "") {
    currentCookies = cookies;
    cookieWrites.length = 0;
    window.history.replaceState({ key: "landing" }, "", path);
    vi.spyOn(document, "cookie", "get").mockImplementation(() => currentCookies);
    vi.spyOn(document, "cookie", "set").mockImplementation((value: string) => {
      cookieWrites.push(value);
    });
  }

  afterEach(() => {
    vi.restoreAllMocks();
    window.history.replaceState(null, "", "/");
  });

  it("stores a valid code and removes it from the URL", () => {
    visit("/?ref=7kx2m9qh4r&utm_source=ig#planes");
    captureReferral();
    expect(cookieWrites).toEqual([referralCookie("7KX2M9QH4R", window.location.hostname)]);
    expect(`${window.location.pathname}${window.location.search}${window.location.hash}`).toBe(
      "/?utm_source=ig#planes",
    );
    expect(window.history.state).toEqual({ key: "landing" });
  });

  it("keeps the first touch", () => {
    visit("/?ref=7KX2M9QH4R", "boxlead_ref=AAAAAAAAAA");
    captureReferral();
    expect(cookieWrites).toEqual([]);
    expect(window.location.search).toBe("");
  });

  it("drops an invalid code without a cookie", () => {
    visit("/?ref=nope");
    captureReferral();
    expect(cookieWrites).toEqual([]);
    expect(window.location.search).toBe("");
  });

  it("does nothing without the parameter", () => {
    visit("/?utm_source=ig");
    const replaceState = vi.spyOn(window.history, "replaceState");
    captureReferral();
    expect(cookieWrites).toEqual([]);
    expect(replaceState).not.toHaveBeenCalled();
    expect(window.location.search).toBe("?utm_source=ig");
  });
});
