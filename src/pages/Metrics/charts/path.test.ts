import { describe, expect, it } from "vitest";
import { smoothPath } from "./path";

describe("smooth path", () => {
  it("passes through every point without overshooting flat stretches", () => {
    const d = smoothPath([
      { x: 0, y: 10 },
      { x: 10, y: 10 },
      { x: 20, y: 0 },
    ]);
    expect(d.startsWith("M0.0,10.0")).toBe(true);
    expect(d).toContain("10.0,10.0 C");
    expect(d.endsWith("20.0,0.0")).toBe(true);
    expect(d).toContain("C3.3,10.0 6.7,10.0 10.0,10.0");
  });

  it("handles empty and single points", () => {
    expect(smoothPath([])).toBe("");
    expect(smoothPath([{ x: 1, y: 2 }])).toBe("M1,2");
  });
});
