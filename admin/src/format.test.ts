import { describe, expect, it } from "vitest";
import { formatMicros } from "./format";

const plain = (text: string) => text.replace(/\s/g, " ");

describe("formatMicros", () => {
  it("rounds every usage cost to two decimals so rows and totals read the same", () => {
    expect(plain(formatMicros(170_000, "USD"))).toBe("US$ 0,17");
    expect(plain(formatMicros(176_000, "USD"))).toBe("US$ 0,18");
    expect(plain(formatMicros(1_211_400, "USD"))).toBe("US$ 1,21");
    expect(plain(formatMicros(1_284_500, "USD"))).toBe("US$ 1,28");
    expect(plain(formatMicros(250_000_000, "ARS"))).toBe("$ 250,00");
    expect(formatMicros(0, null)).toBe("0,00");
  });

  it("does not show a cost under a cent as free", () => {
    expect(plain(formatMicros(2_100, "USD"))).toBe("Menos de US$ 0,01");
    expect(plain(formatMicros(5_000, "USD"))).toBe("US$ 0,01");
    expect(plain(formatMicros(0, "USD"))).toBe("US$ 0,00");
  });

  it("keeps an unknown currency readable", () => {
    expect(formatMicros(1_500_000, "XX1")).toBe("XX1 1,50");
  });
});
