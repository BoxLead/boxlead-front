import { describe, expect, it } from "vitest";
import { addDays, dateRange, daysBetween, isoDate, weekdayIndex } from "./dates";

describe("dates", () => {
  it("moves across months and years", () => {
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(daysBetween("2026-09-08", "2026-10-07")).toBe(29);
  });

  it("lists every day of a range", () => {
    expect(dateRange("2026-10-05", "2026-10-07")).toEqual(["2026-10-05", "2026-10-06", "2026-10-07"]);
    expect(dateRange("2026-10-07", "2026-10-06")).toEqual([]);
  });

  it("counts weekdays from Monday", () => {
    expect(weekdayIndex("2026-10-05")).toBe(0);
    expect(weekdayIndex("2026-10-11")).toBe(6);
    expect(isoDate(new Date(2026, 0, 9))).toBe("2026-01-09");
  });
});
