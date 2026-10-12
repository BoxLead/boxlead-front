import type { CategoryColor, CategoryResponse } from "../api/types";

export const CATEGORY_NAME_MAX = 40;
export const CATEGORY_DESCRIPTION_MAX = 280;
export const UNCATEGORIZED = "none";

const COLOR_LABELS: Record<CategoryColor, string> = {
  BLUE: "Azul",
  GREEN: "Verde",
  YELLOW: "Amarillo",
  ORANGE: "Naranja",
  RED: "Rojo",
  PURPLE: "Violeta",
  PINK: "Rosa",
  GRAY: "Gris",
};

export const CATEGORY_COLORS = Object.keys(COLOR_LABELS) as CategoryColor[];

export function colorLabel(color: CategoryColor): string {
  return COLOR_LABELS[color];
}

export function colorClass(color: CategoryColor): string {
  return `category-color-${color.toLowerCase()}`;
}

export function leadCountLabel(count: number): string {
  return count === 1 ? "1 lead" : `${count.toLocaleString("es-AR")} leads`;
}

export function categoryById(categories: CategoryResponse[] | undefined, id: string | null | undefined) {
  return id ? categories?.find((category) => category.id === id) : undefined;
}

export function nextColor(categories: CategoryResponse[]): CategoryColor {
  const used = new Set(categories.map((category) => category.color));
  return CATEGORY_COLORS.find((color) => !used.has(color)) ?? CATEGORY_COLORS[categories.length % CATEGORY_COLORS.length];
}

export function categoryErrorMessage(message: string): string {
  if (/already in use/i.test(message)) return "Ya tenés una categoría con ese nombre.";
  if (/up to \d+ categories/i.test(message)) return "Llegaste al máximo de categorías. Eliminá una para crear otra.";
  if (/not found/i.test(message)) return "Esta categoría ya no existe. Actualizá la página.";
  return message;
}
