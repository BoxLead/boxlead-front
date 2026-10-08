import { describe, expect, it } from "vitest";
import type { CategoryResponse } from "../api/types";
import { buildDemoReport, DEMO_SETTINGS } from "./metricsDemo";

const categories: CategoryResponse[] = ["Consulta", "Presupuesto", "Postventa", "Reclamo"].map((name, position) => ({
  id: `c${position}`,
  name,
  description: null,
  color: "BLUE",
  position,
  leadCount: 0,
  createdAt: "",
  updatedAt: "",
}));

function report(from: string, to: string, settings = DEMO_SETTINGS) {
  return buildDemoReport({ from, to, today: "2026-10-07", timezone: "UTC", categories, settings });
}

function sum(from: string, to: string, field: "leads" | "qualified" | "agentReplies" | "unanswered") {
  return report(from, to).segments.reduce(
    (total, segment) => total + segment.days.reduce((acc, day) => acc + day[field], 0),
    0,
  );
}

describe("demo metrics", () => {
  it("returns the same numbers for the same range", () => {
    const first = report("2026-09-08", "2026-10-07");
    const second = report("2026-09-08", "2026-10-07");
    expect(first).toEqual(second);
  });

  it("adds up across ranges", () => {
    for (const field of ["leads", "qualified", "agentReplies", "unanswered"] as const) {
      expect(sum("2026-09-08", "2026-09-22", field) + sum("2026-09-23", "2026-10-07", field)).toBe(
        sum("2026-09-08", "2026-10-07", field),
      );
    }
  });

  it("only uses the account categories and leaves some leads without one", () => {
    const ids = new Set(report("2026-09-08", "2026-10-07").segments.map((segment) => segment.categoryId));
    expect([...ids].sort()).toEqual([null, "c0", "c1", "c2", "c3"].sort());
  });

  it("never invents activity after today", () => {
    const future = report("2026-10-08", "2026-10-20");
    expect(future.segments).toEqual([]);
  });

  it("drops the after hours breakdown when there are no business hours", () => {
    const segments = report("2026-09-08", "2026-10-07", { ...DEMO_SETTINGS, businessHours: null }).segments;
    expect(segments.every((segment) => segment.outsideHours === null)).toBe(true);
  });

  it("gives every lead one status and every conversation one first response", () => {
    for (const segment of report("2026-09-08", "2026-10-07").segments) {
      const leads = segment.days.reduce((total, day) => total + day.leads, 0);
      const statuses = Object.values(segment.leadStatuses).reduce((total, value) => total + value, 0);
      const answered = [...segment.firstResponse.agent, ...segment.firstResponse.human].reduce((a, b) => a + b, 0);
      const daily = segment.days.reduce(
        (total, day) => total + day.unanswered + day.responseBuckets.reduce((a, b) => a + b, 0),
        0,
      );
      const qualified = segment.days.reduce((total, day) => total + day.qualified, 0);
      expect(statuses).toBe(leads);
      expect(qualified).toBe(segment.leadStatuses.QUALIFIED + segment.leadStatuses.CLOSED);
      expect(daily).toBe(answered + segment.firstResponse.unanswered);
      expect(daily).toBeLessThanOrEqual(leads);
      expect(segment.inboundByHour).toHaveLength(168);
    }
  });

  it("leaves leads that only commented without a conversation", () => {
    const segments = report("2026-09-08", "2026-10-07").segments;
    const instagram = segments.filter((segment) => segment.platform === "INSTAGRAM");
    const leads = instagram.reduce((total, segment) => total + segment.days.reduce((sum, day) => sum + day.leads, 0), 0);
    const uncontacted = instagram.reduce((total, segment) => total + segment.leadStatuses.NEW, 0);
    expect(uncontacted / leads).toBeGreaterThan(0.3);
    const whatsapp = segments.filter((segment) => segment.platform === "WHATSAPP");
    expect(whatsapp.reduce((total, segment) => total + segment.leadStatuses.NEW, 0)).toBeLessThan(10);
  });
});
