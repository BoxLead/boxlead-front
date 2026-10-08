import { describe, expect, it } from "vitest";
import type { LeadResponse } from "../api/types";
import { CONNECTABLE_PLATFORMS, getPlatform, hasStages, stageLabel } from ".";

const lead = (patch: Partial<LeadResponse>): LeadResponse => ({
  id: "1",
  platform: "INSTAGRAM",
  externalLeadId: null,
  name: null,
  email: null,
  phone: null,
  status: "NEW",
  postSaleOnly: false,
  createdAt: "",
  updatedAt: "",
  ...patch,
});

describe("MercadoLibre", () => {
  const meli = getPlatform("MELI");

  it("answers questions before the sale and chats after it", () => {
    expect(meli.reply("PRE_SALE")).toMatchObject({ kind: "questions", maxLength: 2000 });
    expect(meli.reply("POST_SALE")).toMatchObject({ kind: "chat", maxLength: 350 });
    expect(stageLabel("MELI", "PRE_SALE")).toBe("Preguntas");
    expect(stageLabel("MELI", "POST_SALE")).toBe("Postventa");
    expect(hasStages("MELI")).toBe(true);
  });

  it.each([
    [409, "MELI account 9 must be reconnected: its authorization expired or was revoked", "reconnect", "Hay que reconectar MercadoLibre"],
    [409, "Cannot send MELI message: MELI only lets you answer open pre-sale questions, and this buyer has none unanswered.", null, "No hay preguntas pendientes"],
    [409, "Cannot send MELI message: lead 7 has no MELI user id", null, "No pudimos identificar al comprador"],
    [409, "Cannot send MELI message: no order/pack is known for this conversation yet. It is learned from the buyer's next message.", null, "Todavía no hay una venta asociada"],
    [400, "MELI answers are limited to 2000 characters", null, "El mensaje es demasiado largo"],
    [400, "MELI messages are limited to 350 characters", null, "El mensaje es demasiado largo"],
    [502, "MELI answer failed (HTTP 400 BAD_REQUEST): {\"message\":\"Question already answered\"}", "retry", "MercadoLibre rechazó el mensaje"],
    [502, "MELI send message failed (HTTP 403 FORBIDDEN): {\"message\":\"blocked_by_mediation\"}", null, "MercadoLibre bloqueó el envío"],
  ])("explains %i %s", (status, message, action, title) => {
    expect(meli.explainError(status, message)).toMatchObject({ action, title });
  });

  it("surfaces the upstream reason from a MercadoLibre rejection", () => {
    const view = meli.explainError(502, 'MELI answer failed (HTTP 400 BAD_REQUEST): {"message":"Question already answered"}');
    expect(view?.detail).toBe("Question already answered");
  });

  it("leaves unknown errors to the generic handler", () => {
    expect(meli.explainError(500, "Internal server error")).toBeNull();
  });
});

describe("Instagram", () => {
  const instagram = getPlatform("INSTAGRAM");

  it("can answer comments in public and loads the posts they were made on", () => {
    expect(instagram.hasContext).toBe(true);
    expect(instagram.commentReply).toMatchObject({ maxLength: 2200 });
    expect(instagram.commentReply?.postLabel("REELS")).toBe("un reel");
    expect(instagram.commentReply?.postLabel("STORY")).toBe("una historia");
    expect(instagram.commentReply?.postLabel(null)).toBe("una publicación");
    expect(getPlatform("MELI").commentReply).toBeUndefined();
  });

  it("warns that a private reply to a comment can only be sent once", () => {
    expect(instagram.reply("PRE_SALE")).toMatchObject({ kind: "chat", maxLength: 1000 });
    expect(instagram.reply("PRE_SALE").hint).toMatch(/una sola vez/);
  });

  it.each([
    [409, "Cannot send Instagram message: the reply window is closed and there is no recent comment left to answer privately.", null, "Ya no podés escribirle por privado"],
    [400, "Instagram messages are limited to 1000 bytes", null, "El mensaje es demasiado largo"],
    [400, "Instagram comments are limited to 2200 characters", null, "El mensaje es demasiado largo"],
    [409, "Instagram account 3 must be reconnected: its authorization expired or was revoked", "reconnect", "Hay que reconectar Instagram"],
  ])("explains %i %s", (status, message, action, title) => {
    expect(instagram.explainError(status, message)).toMatchObject({ action, title });
  });

  it("states the comment limit in the length error of a public reply", () => {
    expect(instagram.explainError(400, "Instagram comments are limited to 2200 characters")?.detail).toContain("2.200");
  });
});

describe("contact fields", () => {
  it("links WhatsApp contacts to wa.me with digits only", () => {
    const [field] = getPlatform("WHATSAPP").contactFields(lead({ platform: "WHATSAPP", phone: "+54 9 11 5555-0142" }));
    expect(field).toEqual({ label: "WhatsApp", value: "+54 9 11 5555-0142", href: "https://wa.me/5491155550142" });
  });

  it("links Instagram usernames to their profile and skips display names", () => {
    expect(getPlatform("INSTAGRAM").contactFields(lead({ name: "sofi.decoraciones" }))[0]?.href)
      .toBe("https://www.instagram.com/sofi.decoraciones/");
    expect(getPlatform("INSTAGRAM").contactFields(lead({ name: "Sofía Díaz" }))).toEqual([]);
  });

  it("uses email and phone from MercadoLibre orders", () => {
    const fields = getPlatform("MELI").contactFields(lead({ platform: "MELI", email: "c@example.com", phone: "11 5555 0199" }));
    expect(fields.map((f) => f.href)).toEqual(["mailto:c@example.com", "tel:1155550199"]);
  });
});

describe("registry", () => {
  it("offers the four live channels for connection, MercadoLibre first", () => {
    expect(CONNECTABLE_PLATFORMS.map((p) => p.id)).toEqual(["MELI", "WHATSAPP", "INSTAGRAM", "META"]);
  });
});
