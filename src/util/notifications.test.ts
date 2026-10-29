import { describe, expect, it } from "vitest";
import type { AppNotification, NotificationKind, PlatformType } from "../api/types";
import { noticeMessages } from "./notifications";

let nextId = 0;

function notice(kind: NotificationKind, platform: PlatformType = "WHATSAPP"): AppNotification {
  nextId += 1;
  return { id: nextId, kind, platform, leadId: null, conversationId: null, createdAt: "2026-10-29T12:00:00Z" };
}

describe("notice messages", () => {
  it("names the channel of a single new lead", () => {
    expect(noticeMessages([notice("NEW_LEAD")])).toEqual([{ kind: "NEW_LEAD", text: "Entró un lead nuevo por WhatsApp" }]);
  });

  it("counts new leads and keeps the channel only when all came from the same one", () => {
    expect(noticeMessages([notice("NEW_LEAD", "MELI"), notice("NEW_LEAD", "MELI")])[0].text).toBe(
      "Entraron 2 leads nuevos por MercadoLibre",
    );
    expect(
      noticeMessages([notice("NEW_LEAD"), notice("NEW_LEAD", "INSTAGRAM"), notice("NEW_LEAD", "META")])[0].text,
    ).toBe("Entraron 3 leads nuevos");
  });

  it("groups per kind with one message each", () => {
    expect(noticeMessages([notice("HANDOFF"), notice("NEW_LEAD"), notice("HANDOFF", "INSTAGRAM")])).toEqual([
      { kind: "NEW_LEAD", text: "Entró un lead nuevo por WhatsApp" },
      { kind: "HANDOFF", text: "2 conversaciones necesitan tu respuesta" },
    ]);
    expect(noticeMessages([notice("HANDOFF")])).toEqual([{ kind: "HANDOFF", text: "Una conversación necesita tu respuesta" }]);
  });

  it("says nothing without notices", () => {
    expect(noticeMessages([])).toEqual([]);
  });
});
