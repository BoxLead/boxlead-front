import { describe, expect, it } from "vitest";
import { buildInsights, type InsightInput } from "./insights";
import { emptyTotals, rates, type BreakdownRow, type Totals } from "./metricsModel";

function totals(patch: Partial<Totals>): Totals {
  return { ...emptyTotals(), ...patch };
}

function row(id: string, leads: number, qualified: number, previousLeads = 0): BreakdownRow {
  const t = totals({ leads, qualified });
  return { id, totals: t, previousLeads, rates: rates(t) };
}

function input(patch: Partial<InsightInput>): InsightInput {
  return {
    days: 30,
    current: totals({ leads: 100 }),
    previous: totals({ leads: 100 }),
    channels: [],
    categories: [],
    categoryName: (id) => `Categoría ${id}`,
    ...patch,
  };
}

describe("insights", () => {
  it("puts conversations waiting for an answer first, with a link to the inbox", () => {
    const current = totals({ leads: 100, firstResponse: { ...emptyTotals().firstResponse, unanswered: 5 } });
    const [first] = buildInsights(input({ current, previous: totals({ leads: 60 }) }));
    expect(first.title).toBe("5 conversaciones esperan respuesta");
    expect(first.action?.to).toBe("/app/inbox?unread=1");
  });

  it("points out a channel that qualifies better than the one with more volume", () => {
    const insights = buildInsights(input({ channels: [row("INSTAGRAM", 120, 24), row("WHATSAPP", 60, 30)] }));
    const insight = insights.find((item) => item.id === "channel-quality");
    expect(insight?.title).toBe("WhatsApp califica 2,5 veces más que Instagram");
    expect(insight?.action?.to).toBe("/app/leads?channel=WHATSAPP");
  });

  it("stays quiet when samples are small or nothing changed", () => {
    const insights = buildInsights(
      input({ channels: [row("INSTAGRAM", 10, 1), row("WHATSAPP", 5, 4)], categories: [row("a", 12, 2, 4)] }),
    );
    expect(insights).toEqual([]);
  });

  it("flags a category that grew against the previous period", () => {
    const insights = buildInsights(input({ categories: [row("a", 60, 10, 30), row("none", 90, 1, 20)] }));
    expect(insights.map((item) => item.title)).toEqual(["Categoría a creció 100%"]);
  });

  it("reports the volume change against the previous period", () => {
    const [insight] = buildInsights(input({ days: 7, current: totals({ leads: 80 }), previous: totals({ leads: 100 }) }));
    expect(insight).toMatchObject({ tone: "attention", title: "Recibiste 20% menos leads" });
    expect(insight.detail).toBe("Fueron 80 contra 100 en la semana anterior.");
  });
});
