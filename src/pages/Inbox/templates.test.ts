import { describe, expect, it } from "vitest";
import type { MessageTemplate } from "../../api/types";
import { emptyValues, fillTemplate, hasAllValues, templatesKey } from "./templates";

const template: MessageTemplate = {
  id: "t-1",
  name: "order_update",
  language: "es_AR",
  body: "Hola {{1}}, tu pedido {{2}} salió",
  parameterCount: 2,
};

describe("fillTemplate", () => {
  it("puts each value in its place", () => {
    expect(fillTemplate(template.body, ["Ana", "#123"])).toBe("Hola Ana, tu pedido #123 salió");
  });

  it("keeps the placeholder of a value that is still empty", () => {
    expect(fillTemplate(template.body, ["Ana", "  "])).toBe("Hola Ana, tu pedido {{2}} salió");
    expect(fillTemplate(template.body, [])).toBe(template.body);
  });

  it("repeats a value used twice and leaves special characters alone", () => {
    expect(fillTemplate("{{1}} y {{1}}", ["$1 & más"])).toBe("$1 & más y $1 & más");
  });
});

describe("template values", () => {
  it("starts with one empty value per placeholder", () => {
    expect(emptyValues(template)).toEqual(["", ""]);
  });

  it("is complete only when every value has text", () => {
    expect(hasAllValues(template, ["Ana", ""])).toBe(false);
    expect(hasAllValues(template, ["Ana", "   "])).toBe(false);
    expect(hasAllValues(template, ["Ana", "#123"])).toBe(true);
    expect(hasAllValues({ ...template, parameterCount: 0, body: "Hola" }, [])).toBe(true);
  });

  it("asks for the templates of a conversation", () => {
    expect(templatesKey("c-1")).toBe("/conversations/c-1/templates");
  });
});
