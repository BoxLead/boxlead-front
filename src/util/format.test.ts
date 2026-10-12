import { describe, expect, it } from "vitest";
import { formatListTime, formatMoney, formatPoints, formatRelative, formatSignedPercent } from "./format";

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

  it("signs changes with a real minus sign", () => {
    expect(formatSignedPercent(0.114)).toBe("+11%");
    expect(formatSignedPercent(-0.14)).toBe("\u221214%");
    expect(formatSignedPercent(0.001)).toBe("0%");
    expect(formatPoints(-0.0436)).toBe("\u22124,4 pp");
    expect(formatPoints(0.05)).toBe("+5 pp");
  });
});
