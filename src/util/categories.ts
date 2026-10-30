import i18next from "i18next";
import type { CategoryColor, CategoryResponse } from "../api/types";
import { intlLocale } from "../i18n/locale";

export const CATEGORY_NAME_MAX = 40;
export const CATEGORY_DESCRIPTION_MAX = 280;
export const UNCATEGORIZED = "none";

export const CATEGORY_COLORS: CategoryColor[] = ["BLUE", "GREEN", "YELLOW", "ORANGE", "RED", "PURPLE", "PINK", "GRAY"];

export function colorLabel(color: CategoryColor): string {
  return i18next.t(`category.colors.${color}`, { ns: "shell" });
}

export function colorClass(color: CategoryColor): string {
  return `category-color-${color.toLowerCase()}`;
}

export function leadCountLabel(count: number): string {
  return i18next.t("category.leadCount", { ns: "shell", count, formatted: count.toLocaleString(intlLocale()) });
}

export function categoryById(categories: CategoryResponse[] | undefined, id: string | null | undefined) {
  return id ? categories?.find((category) => category.id === id) : undefined;
}

export function nextColor(categories: CategoryResponse[]): CategoryColor {
  const used = new Set(categories.map((category) => category.color));
  return CATEGORY_COLORS.find((color) => !used.has(color)) ?? CATEGORY_COLORS[categories.length % CATEGORY_COLORS.length];
}

export function categoryErrorMessage(message: string): string {
  if (/already in use/i.test(message)) return i18next.t("category.errors.duplicate", { ns: "shell" });
  if (/up to \d+ categories/i.test(message)) return i18next.t("category.errors.max", { ns: "shell" });
  if (/not found/i.test(message)) return i18next.t("category.errors.notFound", { ns: "shell" });
  return message;
}
