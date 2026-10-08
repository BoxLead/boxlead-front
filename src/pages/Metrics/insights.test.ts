import { describe, expect, it } from "vitest";
import { buildInsights, type InsightInput } from "./insights";
import type { BreakdownRow } from "./breakdown";
import { emptyTotals, qualificationRate, type Totals } from "./metricsModel";

function totals(patch: Partial<Totals>): Totals {
  return { ...emptyTotals(), ...patch };
}

function row(id: string, leads: number, qualified: number, previousLeads = 0): BreakdownRow {
  const t = totals({ leads, qualified });
  return { id, totals: t, previousLeads, qualification: qualificationRate(t) };
}

function input(patch: Partial<InsightInput>): InsightInput {
  return {
    current: totals({ leads: 100 }),
    channels: [],
    categories: [],
    categoryName: (id) => `Categoría ${id}`,
    ...patch,
  };
}

describe("signals", () => {
  it("puts conversations waiting for an answer first", () => {
    const current = totals({ leads: 100, firstResponse: { ...emptyTotals().firstResponse, unanswered: 5 } });
    const [first] = buildInsights(input({ current, channels: [row("INSTAGRAM", 120, 24), row("WHATSAPP", 60, 30)] }));
    expect(first.title).toBe("5 conversaciones sin respuesta");
    expect(first.action?.to).toBe("/app/inbox?unread=1");
  });

  it("points out a channel that qualifies better than the one with more volume", () => {
    const [insight] = buildInsights(input({ channels: [row("INSTAGRAM", 120, 24), row("WHATSAPP", 60, 30)] }));
    expect(insight.title).toBe("WhatsApp califica 2,5× más que Instagram");
    expect(insight.action?.to).toBe("/app/leads?channel=WHATSAPP");
  });

  it("compares answers under 5 minutes with answers after an hour", () => {
    const firstResponse = {
      agent: [80, 20, 0, 0, 0, 0, 0],
      human: [0, 0, 10, 10, 15, 10, 5],
      converted: [36, 9, 2, 2, 2, 1, 0],
      unanswered: 0,
    };
    const [insight] = buildInsights(input({ current: totals({ leads: 150, firstResponse }) }));
    expect(insight.title).toBe("Responder en menos de 5 min califica 4,5× más");
  });

  it("stays quiet when samples are small", () => {
    expect(
      buildInsights(input({ channels: [row("INSTAGRAM", 10, 1), row("WHATSAPP", 5, 4)], categories: [row("a", 12, 2, 4)] })),
    ).toEqual([]);
  });

  it("flags a category that grew against the previous period", () => {
    const insights = buildInsights(input({ categories: [row("a", 60, 10, 30), row("none", 90, 1, 20)] }));
    expect(insights.map((item) => item.title)).toEqual(["Categoría a creció 100%"]);
  });
});
