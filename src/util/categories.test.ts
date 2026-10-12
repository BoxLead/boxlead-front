import { describe, expect, it } from "vitest";
import type { CategoryResponse } from "../api/types";
import {
  CATEGORY_COLORS,
  categoryById,
  categoryErrorMessage,
  colorClass,
  colorLabel,
  leadCountLabel,
  nextColor,
} from "./categories";

const category = (patch: Partial<CategoryResponse>): CategoryResponse => ({
  id: "c",
  name: "Consulta",
  description: null,
  color: "BLUE",
  position: 0,
  leadCount: 0,
  createdAt: "",
  updatedAt: "",
  ...patch,
});

describe("categories", () => {
  it("maps every color to a Spanish label and a CSS class", () => {
    expect(CATEGORY_COLORS).toHaveLength(8);
    expect(colorLabel("PURPLE")).toBe("Violeta");
    expect(colorClass("GRAY")).toBe("category-color-gray");
  });

  it("suggests the first unused color for a new category", () => {
    expect(nextColor([category({ color: "BLUE" }), category({ color: "GREEN" })])).toBe("YELLOW");
    expect(nextColor(CATEGORY_COLORS.map((color) => category({ color })))).toBe("BLUE");
  });

  it("counts leads in Spanish", () => {
    expect(leadCountLabel(0)).toBe("0 leads");
    expect(leadCountLabel(1)).toBe("1 lead");
    expect(leadCountLabel(1500)).toBe("1.500 leads");
  });

  it("finds a category only when there is an id", () => {
    const list = [category({ id: "a" })];
    expect(categoryById(list, "a")?.id).toBe("a");
    expect(categoryById(list, null)).toBeUndefined();
    expect(categoryById(list, "zzz")).toBeUndefined();
  });

  it.each([
    ["Category name already in use", "Ya tenés una categoría con ese nombre."],
    ["You can have up to 30 categories", "Llegaste al máximo de categorías. Eliminá una para crear otra."],
    ["Category not found", "Esta categoría ya no existe. Actualizá la página."],
    ["Algo raro", "Algo raro"],
  ])("explains %s", (message, explained) => {
    expect(categoryErrorMessage(message)).toBe(explained);
  });
});
