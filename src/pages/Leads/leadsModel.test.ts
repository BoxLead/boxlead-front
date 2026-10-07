import { describe, expect, it } from "vitest";
import type { LeadResponse } from "../../api/types";
import { filterLeads, statusCounts } from "./leadsModel";

const lead = (patch: Partial<LeadResponse>): LeadResponse => ({
  id: Math.random().toString(36),
  platform: "MELI",
  campaignId: null,
  externalLeadId: null,
  name: null,
  email: null,
  phone: null,
  status: "NEW",
  postSaleOnly: false,
  createdAt: "2026-10-01T10:00:00Z",
  updatedAt: "2026-10-01T10:00:00Z",
  ...patch,
});

const leads = [
  lead({ id: "a", name: "Martín Gómez", status: "CONTACTED", categoryId: "cat-1", createdAt: "2026-10-02T10:00:00Z" }),
  lead({ id: "b", name: "Carolina", postSaleOnly: true, email: "caro@example.com", phone: "11 5555-0199" }),
  lead({ id: "c", platform: "WHATSAPP", name: "Herrera", phone: "+54 9 11 5555 0142", status: "QUALIFIED" }),
];
const base = { status: null, channel: "ALL" as const, includeBuyers: false, category: null, query: "" };

describe("filterLeads", () => {
  it("hides post-sale buyers unless asked and sorts newest first", () => {
    expect(filterLeads(leads, base).map((l) => l.id)).toEqual(["a", "c"]);
    expect(filterLeads(leads, { ...base, includeBuyers: true }).map((l) => l.id)).toEqual(["a", "b", "c"]);
  });

  it("filters by status and channel", () => {
    expect(filterLeads(leads, { ...base, status: "QUALIFIED" }).map((l) => l.id)).toEqual(["c"]);
    expect(filterLeads(leads, { ...base, channel: "MELI" }).map((l) => l.id)).toEqual(["a"]);
  });

  it("searches names without accents, emails and phone digits", () => {
    expect(filterLeads(leads, { ...base, query: "martin" }).map((l) => l.id)).toEqual(["a"]);
    expect(filterLeads(leads, { ...base, includeBuyers: true, query: "caro@" }).map((l) => l.id)).toEqual(["b"]);
    expect(filterLeads(leads, { ...base, query: "5555 0142" }).map((l) => l.id)).toEqual(["c"]);
  });
});

describe("category filter", () => {
  it("keeps one category or the leads without one", () => {
    expect(filterLeads(leads, { ...base, category: "cat-1" }).map((l) => l.id)).toEqual(["a"]);
    expect(filterLeads(leads, { ...base, category: "none" }).map((l) => l.id)).toEqual(["c"]);
    expect(filterLeads(leads, { ...base, category: "missing" })).toEqual([]);
  });
});

describe("statusCounts", () => {
  it("counts every status, including empty ones", () => {
    expect(statusCounts(leads)).toEqual({ NEW: 1, CONTACTED: 1, QUALIFIED: 1, LOST: 0, CLOSED: 0 });
  });
});
