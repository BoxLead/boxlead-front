import { describe, expect, it } from "vitest";
import type { ConversationResponse, LeadResponse, MessageResponse } from "../../api/types";
import { filterRows, groupByDay, pairQuestions, toRows, unreadBy } from "./inboxModel";

const conversation = (patch: Partial<ConversationResponse>): ConversationResponse => ({
  id: "c",
  leadId: "l",
  platform: "MELI",
  externalThreadId: null,
  salesStage: "PRE_SALE",
  status: "OPEN",
  createdAt: "2026-10-01T10:00:00Z",
  updatedAt: "2026-10-01T10:00:00Z",
  ...patch,
});

const message = (patch: Partial<MessageResponse>): MessageResponse => ({
  id: Math.random().toString(36),
  conversationId: "c",
  direction: "INBOUND",
  externalMessageId: null,
  content: "",
  createdAt: "2026-10-01T10:00:00Z",
  updatedAt: "2026-10-01T10:00:00Z",
  ...patch,
});

describe("toRows", () => {
  it("prefers the summary name, falls back to the lead and sorts by last activity", () => {
    const leads = new Map<string, LeadResponse>([
      ["l2", { id: "l2", platform: "WHATSAPP", externalLeadId: "549", name: null, email: null, phone: "+549", status: "NEW", postSaleOnly: false, createdAt: "", updatedAt: "" }],
    ]);
    const rows = toRows(
      [
        conversation({ id: "a", leadName: "CAROLINA_PZ", lastMessageAt: "2026-10-01T09:00:00Z", unreadCount: 2, lastMessageDirection: "INBOUND" }),
        conversation({ id: "b", leadId: "l2", platform: "WHATSAPP", updatedAt: "2026-10-01T11:00:00Z" }),
        conversation({ id: "c", leadId: "missing", updatedAt: "2026-10-01T08:00:00Z" }),
      ],
      leads,
    );
    expect(rows.map((r) => [r.id, r.displayName])).toEqual([
      ["b", "+549"],
      ["a", "CAROLINA_PZ"],
      ["c", "Contacto de MercadoLibre"],
    ]);
    expect(rows[1]).toMatchObject({ unread: 2, awaitingReply: true });
    expect(rows[0]).toMatchObject({ unread: 0, awaitingReply: false });
  });
});

describe("filterRows", () => {
  const rows = toRows(
    [
      conversation({ id: "pre", leadName: "Martín Gómez", lastMessagePreview: "¿Hacen envío a Córdoba?", unreadCount: 1 }),
      conversation({ id: "post", leadName: "Carolina", salesStage: "POST_SALE" }),
      conversation({ id: "wa", platform: "WHATSAPP", leadName: "Herrera", unreadCount: 3 }),
    ],
    new Map(),
  );

  it("filters by channel and stage", () => {
    expect(filterRows(rows, { channel: "MELI", stage: "POST_SALE", query: "", unreadOnly: false }).map((r) => r.id)).toEqual(["post"]);
  });

  it("searches names and previews ignoring accents and case", () => {
    expect(filterRows(rows, { channel: "ALL", stage: null, query: "cordoba", unreadOnly: false }).map((r) => r.id)).toEqual(["pre"]);
    expect(filterRows(rows, { channel: "ALL", stage: null, query: "MARTIN", unreadOnly: false }).map((r) => r.id)).toEqual(["pre"]);
  });

  it("can show only unread conversations and count them per channel", () => {
    expect(filterRows(rows, { channel: "ALL", stage: null, query: "", unreadOnly: true }).map((r) => r.id).sort()).toEqual(["pre", "wa"]);
    expect(unreadBy(rows, (r) => r.platform)).toEqual({ MELI: 1, WHATSAPP: 3 });
  });
});

describe("pairQuestions", () => {
  it("matches each MercadoLibre answer to its question and finds the oldest pending one", () => {
    const thread = pairQuestions([
      message({ id: "q1", externalMessageId: "101", content: "¿Stock en negro?", contextRef: "MLA1" }),
      message({ id: "a1", direction: "OUTBOUND", externalMessageId: "101:answer", content: "Sí" }),
      message({ id: "q2", externalMessageId: "102", content: "¿Envío?", contextRef: "MLA1" }),
      message({ id: "q3", externalMessageId: "103", content: "¿Factura A?", contextRef: "MLA2" }),
    ]);
    expect(thread.entries.map((e) => [e.question.id, e.answer?.id ?? null])).toEqual([
      ["q1", "a1"],
      ["q2", null],
      ["q3", null],
    ]);
    expect(thread.nextToAnswer?.question.id).toBe("q2");
    expect(thread.pending).toHaveLength(2);
    expect(thread.entries[0].contextRef).toBe("MLA1");
  });

  it("has nothing to answer when every question has its answer", () => {
    const thread = pairQuestions([
      message({ externalMessageId: "1" }),
      message({ direction: "OUTBOUND", externalMessageId: "1:answer" }),
    ]);
    expect(thread.nextToAnswer).toBeNull();
  });
});

describe("groupByDay", () => {
  it("splits messages by calendar day with friendly labels", () => {
    const now = new Date("2026-10-04T12:00:00").getTime();
    const groups = groupByDay(
      [
        { createdAt: new Date("2026-10-03T09:00:00").toISOString() },
        { createdAt: new Date("2026-10-04T08:00:00").toISOString() },
        { createdAt: new Date("2026-10-04T09:00:00").toISOString() },
      ],
      now,
    );
    expect(groups.map((g) => [g.label, g.items.length])).toEqual([
      ["Ayer", 1],
      ["Hoy", 2],
    ]);
  });
});
