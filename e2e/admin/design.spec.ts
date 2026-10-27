import type { Page } from "@playwright/test";
import { adminMockUrl, enterAdmin, expect, horizontalOverflow, test, settled } from "./support.ts";

const CONTROLS = new Set([32, 40, 44, 48]);
const CONTROL_SELECTOR = ".btn, .choice-group-segmented, .select, input.input";
const OUTSIDE = "dialog, .admin-sidebar, table, .toast-region";

type Screen = { path: string; scenario: string; follow?: boolean };

const SCREENS: Screen[] = [
  { path: "/", scenario: "customers" },
  { path: "/usuarios", scenario: "customers" },
  { path: "/usuarios", scenario: "customers", follow: true },
  { path: "/suscripciones", scenario: "default" },
  { path: "/pagos", scenario: "default" },
  { path: "/reembolsos", scenario: "default" },
  { path: "/facturas", scenario: "default" },
  { path: "/invitaciones", scenario: "invitations" },
  { path: "/invitaciones?vista=demos", scenario: "invitations" },
  { path: "/revendedores", scenario: "referrals" },
  { path: "/revendedores", scenario: "referrals", follow: true },
  { path: "/comisiones", scenario: "referrals" },
  { path: "/liquidaciones", scenario: "referrals" },
  { path: "/liquidaciones", scenario: "referrals", follow: true },
  { path: "/uso", scenario: "operations" },
  { path: "/uso?view=detalle", scenario: "operations" },
  { path: "/pedidos", scenario: "operations" },
  { path: "/pedidos?status=RESOLVED", scenario: "operations" },
  { path: "/equipo", scenario: "operations" },
  { path: "/auditoria", scenario: "operations" },
];

type Row = { y: number; heights: number[]; labels: string[] };

async function seed(scenario: string) {
  const res = await fetch(`${adminMockUrl()}/__reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Requested-With": "boxlead-web" },
    body: JSON.stringify({ scenario, roles: ["OWNER"] }),
  });
  expect(res.ok).toBe(true);
}

async function controlRows(page: Page): Promise<Row[]> {
  return page.evaluate(
    ([selector, outside]) => {
      const rows = new Map<number, { heights: number[]; labels: string[] }>();
      for (const element of document.querySelectorAll<HTMLElement>(selector)) {
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        if (element.closest(outside)) continue;
        const key = Math.round(rect.top / 4) * 4;
        const row = rows.get(key) ?? { heights: [], labels: [] };
        row.heights.push(Math.round(rect.height));
        row.labels.push(`${element.tagName.toLowerCase()}.${String(element.className).split(" ")[0]}`);
        rows.set(key, row);
      }
      return [...rows.entries()].map(([y, row]) => ({ y, ...row }));
    },
    [CONTROL_SELECTOR, OUTSIDE] as const,
  );
}

async function tableFacts(page: Page) {
  return page.evaluate(() => {
    const headers = [...document.querySelectorAll<HTMLElement>(".data-table th")].map((th) => getComputedStyle(th).position);
    const numeric = [...document.querySelectorAll<HTMLElement>(".data-table td.data-table-money, .data-table td.data-table-number")].map((td) =>
      getComputedStyle(td).textAlign,
    );
    const clipped = [...document.querySelectorAll<HTMLElement>(".data-table")].map((table) => {
      const panel = table.closest<HTMLElement>(".list-panel, .section") ?? table.parentElement;
      const over = Math.round(table.getBoundingClientRect().right - (panel?.getBoundingClientRect().right ?? 0));
      return `${table.querySelector("caption")?.textContent?.trim()} ${over}`;
    });
    return { headers, numeric, clipped: clipped.filter((entry) => Number(entry.split(" ").pop()) > 0) };
  });
}

async function open(page: Page, screen: Screen) {
  await seed(screen.scenario);
  await enterAdmin(page, screen.path);
  if (screen.follow) {
    await page.locator(".data-table a").first().click();
    await expect(page.getByRole("navigation", { name: "Ubicación" })).toBeVisible();
  }
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator(".skeleton")).toHaveCount(0);
  await settled(page);
}

for (const screen of SCREENS) {
  const name = `${screen.path}${screen.follow ? " and its detail" : ""}`;

  test(`shares the header, the control heights and the table rules on ${name}`, async ({ page }, testInfo) => {
    const mobile = (page.viewportSize()?.width ?? 0) < 760;
    await open(page, screen);

    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("header.admin-header h1.admin-header-title")).toHaveCount(1);
    await expect(page.locator(".admin-header-desc")).toHaveCount(1);
    expect(await horizontalOverflow(page), "no horizontal scroll").toBeLessThanOrEqual(0);

    if (mobile) {
      const toggle = page.getByRole("button", { name: /^Filtros/ });
      if (await toggle.count()) await toggle.click();
    }
    const rows = await controlRows(page);
    const uneven = rows.filter((row) => new Set(row.heights).size > 1);
    expect(uneven.map((row) => `y=${row.y} ${row.labels.map((label, i) => `${label}:${row.heights[i]}`).join(" ")}`)).toEqual([]);
    const offScale = rows.flatMap((row) => row.heights.filter((height) => !CONTROLS.has(height)));
    expect(offScale, "control heights on the scale").toEqual([]);

    const facts = await tableFacts(page);
    expect(facts.numeric.filter((align) => align !== "right" && align !== "end"), "amounts and counts sit on the right").toEqual([]);
    if (!mobile) {
      expect(new Set(facts.headers), "table headers stay in view").toEqual(new Set(facts.headers.length ? ["sticky"] : []));
      expect(facts.clipped, "every table fits its panel").toEqual([]);
    }
    testInfo.annotations.push({ type: "controls", description: String(rows.length) });
  });
}
