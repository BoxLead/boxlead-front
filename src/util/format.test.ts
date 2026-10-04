import { describe, expect, it } from "vitest";
import { formatListTime, formatMoney, formatRelative, truncate } from "./format";

const NOW = new Date("2026-10-04T15:00:00-03:00").getTime();
const minus = (ms: number) => new Date(NOW - ms).toISOString();

describe("formatRelative", () => {
  it.each([
    [30_000, "recién"],
    [4 * 60_000, "hace 4 min"],
    [3 * 3_600_000, "hace 3 h"],
    [30 * 3_600_000, "ayer"],
    [3 * 86_400_000, "hace 3 días"],
  ])("%i ms ago reads %s", (ms, text) => {
    expect(formatRelative(minus(ms), NOW)).toBe(text);
  });

  it("handles missing and invalid dates", () => {
    expect(formatRelative(null, NOW)).toBe("—");
    expect(formatRelative("nope", NOW)).toBe("—");
  });
});

describe("formatListTime", () => {
  it("shows the hour for today and the weekday for this week", () => {
    expect(formatListTime(minus(60_000), NOW)).toMatch(/^\d{2}:\d{2}$/);
    expect(formatListTime(minus(2 * 86_400_000), NOW)).toMatch(/^[a-zá]{2,4}$/);
    expect(formatListTime(null, NOW)).toBe("");
  });
});

describe("formatMoney", () => {
  it("formats pesos without decimals", () => {
    expect(formatMoney(289999, "ARS").replace(/\s/g, " ")).toMatch(/\$ ?289\.999/);
  });

  it("keeps cents when present and survives odd currencies", () => {
    expect(formatMoney(10.5, "USD")).toContain("10,50");
    expect(formatMoney(5, "XXXX")).toContain("5");
    expect(formatMoney(null, "ARS")).toBe("");
  });
});

describe("truncate", () => {
  it("adds an ellipsis only when needed", () => {
    expect(truncate("hola", 10)).toBe("hola");
    expect(truncate("hola mundo", 5)).toBe("hola…");
  });
});
