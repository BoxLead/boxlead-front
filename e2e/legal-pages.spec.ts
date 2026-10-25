import type { Page } from "@playwright/test";
import { expect, expectAccessible, screenshot, test } from "./support.ts";
import { MOCK_API_ORIGIN } from "./ports.ts";

const CONTRACTS = "Contratos de adhesión Ley N° 24.240 de Defensa del Consumidor";

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

async function screenshotThemes(page: Page, name: string) {
  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme });
    await page.evaluate((value) => {
      document.documentElement.dataset.theme = value;
    }, theme);
    await screenshot(page, `${name}-${theme}`);
  }
}

function apiCalls(page: Page): string[] {
  const calls: string[] = [];
  page.on("request", (request) => {
    if (request.url().startsWith(MOCK_API_ORIGIN)) calls.push(request.url());
  });
  return calls;
}

test("the adhesion contracts page opens from the landing with the provider and the consumer clauses", async ({ page }) => {
  test.slow();
  const calls = apiCalls(page);
  await page.goto("/");
  await page.getByRole("contentinfo").getByRole("link", { name: CONTRACTS }).click();
  await expect(page).toHaveURL(/\/contratos$/);
  const main = page.getByRole("main");
  await expect(main.getByRole("heading", { level: 1, name: CONTRACTS })).toBeVisible();
  await expect(page).toHaveTitle(new RegExp(`^${CONTRACTS}`));
  await expect(main).toContainText(/Versión \d{4}-\d{2}/);
  await expect(main.getByRole("heading", { name: "Promociones vigentes" })).toBeVisible();
  await expect(main.getByRole("term").first()).toHaveText("Razón social");
  await expect(main.getByRole("link", { name: "términos y condiciones de Mercado Pago" })).toHaveAttribute(
    "href",
    /^https:\/\/www\.mercadopago\.com\.ar\//,
  );
  await expect(main.getByRole("link", { name: "Botón de arrepentimiento" })).toHaveAttribute("href", "/arrepentimiento");
  await expect(main.getByRole("link", { name: "Botón de baja de servicio" })).toHaveAttribute("href", "/baja");
  await expectNoHorizontalScroll(page);
  await expectAccessible(page);
  await screenshotThemes(page, "legal-contracts");
  expect(calls).toEqual([]);
});
