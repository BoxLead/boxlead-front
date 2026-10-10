import { describe, expect, it } from "vitest";
import { ApiError } from "../api/client";
import type { AgentResponse, AgentScope, CategoryResponse, ChannelRules } from "../api/types";
import {
  agentErrorMessage,
  answeredByLabel,
  describeChannelRules,
  emptyScope,
  hasDuplicateScopes,
  isOrphanedCategory,
  scopeKey,
  scopeLabel,
  toAgentRequest,
  withPlatform,
} from "./agents";

const category = (id: string, name: string): CategoryResponse => ({
  id,
  name,
  description: null,
  color: "BLUE",
  position: 0,
  leadCount: 0,
  createdAt: "",
  updatedAt: "",
});

const categories = [category("c-1", "Presupuesto")];
const scope = (patch: Partial<AgentScope>): AgentScope => ({ ...emptyScope(), ...patch });

describe("scopeLabel", () => {
  it("names only what the rule narrows down", () => {
    expect(scopeLabel(scope({}), categories)).toBe("Todos los canales · Automático");
    expect(scopeLabel(scope({ categoryId: "c-1", replyMode: "DRAFT" }), categories)).toBe(
      "Todos los canales · Presupuesto · Borrador",
    );
    expect(scopeLabel(scope({ platform: "MELI", salesStage: "POST_SALE" }), categories)).toBe(
      "MercadoLibre · Postventa · Automático",
    );
  });

  it("uses the stage name of the channel", () => {
    expect(scopeLabel(scope({ platform: "MELI", salesStage: "PRE_SALE" }), categories)).toContain("Preguntas");
    expect(scopeLabel(scope({ salesStage: "PRE_SALE" }), categories)).toContain("Preventa");
  });

  it("flags a category that no longer exists, but not while categories are loading", () => {
    const orphan = scope({ categoryId: "gone" });
    expect(scopeLabel(orphan, categories)).toBe("Todos los canales · Categoría eliminada · Automático");
    expect(isOrphanedCategory(orphan, categories)).toBe(true);
    expect(isOrphanedCategory(orphan, undefined)).toBe(false);
    expect(scopeLabel(orphan, undefined)).toBe("Todos los canales · Categoría · Automático");
  });
});

describe("scope identity", () => {
  it("ignores the reply mode when comparing rules", () => {
    expect(scopeKey(scope({ replyMode: "AUTO" }))).toBe(scopeKey(scope({ replyMode: "DRAFT" })));
    expect(hasDuplicateScopes([scope({}), scope({ replyMode: "DRAFT" })])).toBe(true);
    expect(hasDuplicateScopes([scope({}), scope({ platform: "WHATSAPP" })])).toBe(false);
  });
});

describe("withPlatform", () => {
  it("keeps a stage the channel supports", () => {
    expect(withPlatform(scope({ salesStage: "POST_SALE" }), "MELI").salesStage).toBe("POST_SALE");
  });

  it("drops a stage the channel does not have", () => {
    expect(withPlatform(scope({ salesStage: "POST_SALE" }), "WHATSAPP")).toMatchObject({
      platform: "WHATSAPP",
      salesStage: null,
    });
  });

  it("keeps any stage when the channel is cleared", () => {
    expect(withPlatform(scope({ platform: "MELI", salesStage: "PRE_SALE" }), null).salesStage).toBe("PRE_SALE");
  });
});

describe("toAgentRequest", () => {
  const agent: AgentResponse = {
    id: "a-1",
    name: "Ventas",
    instructions: "Vendé",
    enabled: true,
    position: 0,
    scopes: [{ id: "s-1", platform: null, categoryId: null, salesStage: null, replyMode: "AUTO" }],
    createdAt: null,
    updatedAt: null,
  };

  it("drops ids and server fields", () => {
    expect(toAgentRequest(agent)).toEqual({
      name: "Ventas",
      instructions: "Vendé",
      enabled: true,
      scopes: [{ platform: null, categoryId: null, salesStage: null, replyMode: "AUTO" }],
    });
  });

  it("applies a patch", () => {
    expect(toAgentRequest(agent, { enabled: false }).enabled).toBe(false);
  });
});

describe("agentErrorMessage", () => {
  it.each([
    [429, "Too many", "Hiciste muchas pruebas seguidas. Probá de nuevo en un rato."],
    [503, "Categories cannot be verified", "No pudimos verificar tus categorías ahora. Probá de nuevo en unos minutos."],
    [422, "Unknown categories: x", "Alguna regla usa una categoría que ya no existe. Quitala o elegí otra."],
    [422, "Validation failed", "Revisá los datos: hay campos con valores inválidos."],
    [404, "Agent not found", "Este agente ya no existe. Actualizá la página."],
  ])("explains a %s", (status, message, expected) => {
    expect(agentErrorMessage(new ApiError(message, status), "fallback")).toBe(expected);
  });

  it("uses the fallback for anything else", () => {
    expect(agentErrorMessage(new ApiError("boom", 500), "fallback")).toBe("fallback");
    expect(agentErrorMessage(new Error("network"), "fallback")).toBe("fallback");
  });
});

describe("describeChannelRules", () => {
  const rules: ChannelRules = {
    channelName: "MercadoLibre",
    maxLength: 2000,
    audience: "PUBLIC",
    singleReply: true,
    contactDetailsAllowed: false,
    guidelines: [],
  };

  it("describes the flags in plain words", () => {
    expect(describeChannelRules(rules)).toEqual([
      { label: "Canal", value: "MercadoLibre" },
      { label: "Quién lo lee", value: "Cualquiera (pública)" },
      { label: "Largo máximo", value: "2.000 caracteres" },
      { label: "Respuesta única", value: "Sí, no se puede corregir ni seguir" },
      { label: "Datos de contacto", value: "No permitidos" },
    ]);
  });

  it("describes a private channel without limits", () => {
    const lines = describeChannelRules({
      ...rules,
      maxLength: null,
      audience: "PRIVATE",
      singleReply: false,
      contactDetailsAllowed: true,
    });
    expect(lines.map((line) => line.value)).toEqual([
      "MercadoLibre",
      "Solo el cliente (privada)",
      "Sin límite",
      "No",
      "Permitidos",
    ]);
  });
});

describe("answeredByLabel", () => {
  it("names the agent", () => {
    expect(answeredByLabel("Ventas")).toBe("Respondido por Ventas");
  });
});
