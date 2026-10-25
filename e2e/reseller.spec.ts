import type { Page, Route } from "@playwright/test";
import { expect, expectAccessible, login, mockApiUrl, resetApi, screenshot, test } from "./support.ts";

const LINK = "https://api.boxlead.app/r/7KX2M9QH4R";
const REFERRALS = "**/referrals/me";

const EMPTY = {
  codes: [{ code: "7KX2M9QH4R", link: LINK, status: "ACTIVE" }],
  stats: { clicksLast30Days: 0, registrations: 0, activeCustomers: 0 },
  customers: [],
  totals: [],
  entries: [],
};

function money(text: string | null): string {
  return (text ?? "").replace(/\s/g, " ");
}

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

async function screenshotThemes(page: Page, name: string, ready: (page: Page) => Promise<void>) {
  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme });
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await ready(page);
    await expectNoHorizontalScroll(page);
    await screenshot(page, `${name}-${theme}`);
  }
}

async function showsData(page: Page) {
  await expect(page.getByText(LINK)).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();
}

test("a reseller sees the link, the customers and the commissions", async ({ page, context }) => {
  test.slow();
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await resetApi("reseller");
  await login(page, "/app/reseller");

  await expect(page).toHaveTitle(/^Revendedor/);
  await expect(page.getByRole("heading", { level: 1, name: "Revendedor" })).toBeVisible();
  await expect(page.getByText(LINK)).toBeVisible();

  await page.getByRole("button", { name: "Copiar link" }).click();
  await expect(page.getByText("Copiaste tu link.")).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(LINK);

  const stats = page.getByLabel("Resumen");
  await expect(stats.getByRole("definition")).toHaveText(["48", "6", "3"]);

  const customers = page.getByRole("list", { name: "Clientes" });
  await expect(customers.getByRole("listitem")).toHaveCount(3);
  await expect(customers.getByRole("listitem").first()).toContainText("Negocio SRL");
  await expect(customers.getByRole("listitem").first()).toContainText("Cobro 3 de 6");
  await expect(customers.getByText("Pago atrasado")).toBeVisible();

  const totals = page.getByLabel("Totales por estado");
  await expect(totals.getByRole("term")).toHaveText(["Pendiente", "Aprobada", "Pagada"]);
  const amounts = await totals.locator(".reseller-total-amount").allTextContents();
  expect(amounts.map(money)).toEqual(["$ 3.703,50", "$ 5.555,25", "$ 16.665,75"]);

  const rows = page.getByRole("table").locator("tbody tr");
  await expect(rows).toHaveCount(4);
  await expect(rows.first()).toContainText("Negocio SRL");
  await expect(rows.first()).toContainText("Pendiente");
  expect(money(await rows.first().locator(".reseller-cell-amount").textContent())).toBe("$ 1.851,75");
  await expect(rows.last()).toContainText("Pagada");

  await expect(page.getByText(/teléfono|@negocio\.com/)).toHaveCount(0);
  await expectNoHorizontalScroll(page);
  await expectAccessible(page);
  await screenshotThemes(page, "reseller-data", showsData);
});

test("the page shows a placeholder while the data loads", async ({ page }) => {
  test.slow();
  await resetApi("reseller");
  const held: Route[] = [];
  await page.route(REFERRALS, (route) => {
    held.push(route);
  });
  await login(page, "/app/reseller");
  await expect(page.getByRole("status").filter({ hasText: "Cargando…" })).toBeAttached();
  await expect(page.getByRole("button", { name: "Copiar link" })).toHaveCount(0);
  await expectNoHorizontalScroll(page);
  await screenshotThemes(page, "reseller-loading", async (current) => {
    await expect(current.locator(".reseller-skeleton-link")).toBeVisible();
  });

  await page.unroute(REFERRALS);
  await Promise.all(held.splice(0).map((route) => route.fallback().catch(() => undefined)));
  await page.reload();
  await expect(page.getByText(LINK)).toBeVisible();
});

test("a new reseller sees empty states", async ({ page }) => {
  test.slow();
  await resetApi("reseller");
  await page.route(REFERRALS, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY) }),
  );
  await login(page, "/app/reseller");
  await expect(page.getByText(LINK)).toBeVisible();
  await expect(page.getByLabel("Resumen").getByRole("definition")).toHaveText(["0", "0", "0"]);
  await expect(page.getByText("Todavía no tenés clientes")).toBeVisible();
  await expect(page.getByText("Todavía no hay comisiones")).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(0);
  await expectNoHorizontalScroll(page);
  await expectAccessible(page);
  await screenshotThemes(page, "reseller-empty", async (current) => {
    await expect(current.getByText("Todavía no hay comisiones")).toBeVisible();
  });
});

test("an error offers a retry", async ({ page }) => {
  test.slow();
  await resetApi("reseller");
  await page.route(REFERRALS, (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "Internal error", message: "Internal error" }),
    }),
  );
  await login(page, "/app/reseller");
  const alert = page.getByRole("alert").filter({ hasText: "No pudimos cargar tus datos de revendedor" });
  await expect(alert).toBeVisible();
  await expectNoHorizontalScroll(page);
  await expectAccessible(page);
  await screenshotThemes(page, "reseller-error", async (current) => {
    await expect(current.getByRole("button", { name: "Reintentar" })).toBeVisible();
  });

  await page.unroute(REFERRALS);
  await page.getByRole("button", { name: "Reintentar" }).click();
  await expect(page.getByText(LINK)).toBeVisible();
  await expect(alert).toHaveCount(0);
});

for (const scenario of ["billing-active", "default"] as const) {
  test(`a user who is not a reseller never reaches the page (${scenario})`, async ({ page }) => {
    await resetApi(scenario);
    const referralCalls: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/referrals/")) referralCalls.push(request.url());
    });
    await login(page, "/app/reseller");
    await expect(page).toHaveURL(/\/$/);
    expect(referralCalls).toEqual([]);

    const response = await page.context().request.get(`${mockApiUrl()}/referrals/me`, {
      headers: { "X-Requested-With": "boxlead-web" },
    });
    expect(response.status()).toBe(404);
  });
}
