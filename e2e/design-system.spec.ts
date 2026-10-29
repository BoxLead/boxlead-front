import type { Page } from "@playwright/test";
import { expect, login, resetApi, test } from "./support.ts";

const SPACING = new Set([0, 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80]);
const CONTROLS = new Set([32, 40, 44, 48]);

const ROUTES = ["/app/inbox", "/app/leads", "/app/metrics", "/app/categories", "/app/agents", "/app/connections", "/app/notificaciones", "/avisos/baja"];

type Row = { y: number; heights: number[]; labels: string[] };

async function controlRows(page: Page): Promise<Row[]> {
  return page.evaluate(() => {
    const selector = ".btn, .choice-group-segmented, .choice-group-chips .choice, .select, input.input, .conversation-search, .leads-search, .status-select select, .category-select select, .temperature-select select";
    const rows = new Map<number, { heights: number[]; labels: string[] }>();
    for (const element of document.querySelectorAll<HTMLElement>(selector)) {
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (element.closest("dialog, .toast-region, .sidebar, table")) continue;
      const key = Math.round(rect.top / 4) * 4;
      const row = rows.get(key) ?? { heights: [], labels: [] };
      row.heights.push(Math.round(rect.height));
      row.labels.push(`${element.tagName.toLowerCase()}.${String(element.className).split(" ")[0]}`);
      rows.set(key, row);
    }
    return [...rows.entries()].map(([y, row]) => ({ y, ...row }));
  });
}

async function gutters(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    for (const selector of [".page", ".inbox-header", ".agents-header", ".panel", ".conversation-list-tools", ".leads-toolbar"]) {
      for (const element of document.querySelectorAll<HTMLElement>(selector)) {
        const style = getComputedStyle(element);
        for (const side of ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft"] as const) {
          out.push(`${selector} ${side} ${style[side]}`);
        }
      }
    }
    return out;
  });
}

test.beforeEach(async () => {
  await resetApi("showcase", undefined, { notifications: true });
});

for (const route of ROUTES) {
  test(`controls on the same row share a height and gutters follow the scale on ${route}`, async ({ page }) => {
    await login(page, route);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.waitForTimeout(400);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, "no horizontal scroll").toBeLessThanOrEqual(0);

    const rows = await controlRows(page);
    const uneven = rows.filter((row) => new Set(row.heights).size > 1);
    expect(uneven.map((row) => `y=${row.y} ${row.labels.map((label, i) => `${label}:${row.heights[i]}`).join(" ")}`)).toEqual([]);
    const offScale = rows.flatMap((row) => row.heights.filter((height) => !CONTROLS.has(height)));
    expect(offScale, "control heights on the scale").toEqual([]);

    const padding = await gutters(page);
    const bad = padding.filter((entry) => {
      const value = Number(entry.split(" ").pop()?.replace("px", ""));
      return !SPACING.has(value);
    });
    expect(bad).toEqual([]);
  });
}

test("the first steps panel keeps controls and gutters on the scale", async ({ page }) => {
  await resetApi("empty", undefined, { onboarding: true });
  await login(page, "/app/inbox");
  await expect(page.getByRole("region", { name: "Primeros pasos" })).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, "no horizontal scroll").toBeLessThanOrEqual(0);

  const rows = await controlRows(page);
  expect(rows.filter((row) => new Set(row.heights).size > 1)).toEqual([]);
  expect(rows.flatMap((row) => row.heights.filter((height) => !CONTROLS.has(height)))).toEqual([]);

  const padding = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>(".onboarding, .onboarding-step")].flatMap((element) => {
      const style = getComputedStyle(element);
      return [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft].map(
        (value) => `${element.className} ${value}`,
      );
    }),
  );
  expect(padding.filter((entry) => !SPACING.has(Number(entry.split(" ").pop()?.replace("px", ""))))).toEqual([]);
});
