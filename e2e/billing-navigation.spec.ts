import type { Page } from "@playwright/test";
import { expect, expectAccessible, login, resetApi, screenshot, test } from "./support.ts";

const PUBLIC_PATHS = ["/invitacion", "/terminos", "/privacidad", "/contratos", "/arrepentimiento", "/baja"];

async function openAccount(page: Page) {
  await page.getByRole("button", { name: "Cuenta" }).click();
  return page.getByRole("dialog", { name: "Cuenta" });
}

async function screenshotThemes(page: Page, name: string, title: string, withMenu = false) {
  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme });
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    if (withMenu) await openAccount(page);
    await screenshot(page, `${name}-${theme}`);
  }
}

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

test("without billing the account menu and the routes stay as today", async ({ page }) => {
  test.slow();
  await resetApi();
  await login(page);
  const account = await openAccount(page);
  await expect(account.getByRole("button", { name: "Cerrar sesión" })).toBeVisible();
  await expect(account.getByRole("link")).toHaveCount(0);
  await screenshotThemes(page, "billing-off-menu", "Bandeja", true);

  for (const path of ["/app/billing", "/app/billing/return", "/app/reseller"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/$/);
  }
});

test("the new public pages keep sending visitors to the landing", async ({ page }) => {
  for (const path of PUBLIC_PATHS) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/$/);
  }
});

test("the invitation page asks for the session and keeps protected routes closed", async ({ page }) => {
  const sessionChecks: string[] = [];
  page.on("request", (request) => {
    if (request.url().endsWith("/auth/me")) sessionChecks.push(request.url());
  });
  await page.goto("/invitacion");
  await expect(page).toHaveURL(/\/$/);
  expect(sessionChecks.length).toBeGreaterThan(0);

  await page.goto("/app/billing");
  await expect(page).toHaveURL(/\/login\?next=%2Fapp%2Fbilling$/);
});

test("with billing the account menu links billing and the consumer pages", async ({ page }) => {
  test.slow();
  await resetApi("billing-active");
  await login(page);
  const account = await openAccount(page);
  await expect(account.getByRole("link", { name: "Facturación" })).toBeVisible();
  await expect(account.getByRole("link", { name: "Revendedor" })).toHaveCount(0);
  await expect(account.getByRole("link", { name: "Botón de arrepentimiento" })).toHaveAttribute("href", "/arrepentimiento");
  await expect(account.getByRole("link", { name: "Botón de baja de servicio" })).toHaveAttribute("href", "/baja");
  await expectNoHorizontalScroll(page);
  await expectAccessible(page);

  await screenshotThemes(page, "billing-menu", "Bandeja", true);

  await account.getByRole("link", { name: "Facturación" }).click();
  await expect(page).toHaveURL(/\/app\/billing$/);
  await expect(page.getByRole("heading", { level: 1, name: "Facturación" })).toBeVisible();
  await expect(page).toHaveTitle(/^Facturación/);
  await expectNoHorizontalScroll(page);
  await screenshotThemes(page, "billing-page", "Facturación");

  await page.goto("/app/billing/return?status=approved");
  await expect(page.getByRole("heading", { level: 1, name: "Estado del pago" })).toBeVisible();

  await page.goto("/app/reseller");
  await expect(page).toHaveURL(/\/$/);
});

test("resellers also get their page", async ({ page }) => {
  test.slow();
  await resetApi("reseller");
  await login(page);
  const account = await openAccount(page);
  await expect(account.getByRole("link", { name: "Facturación" })).toBeVisible();
  await account.getByRole("link", { name: "Revendedor" }).click();
  await expect(page).toHaveURL(/\/app\/reseller$/);
  await expect(page.getByRole("heading", { level: 1, name: "Revendedor" })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Cuenta" })).toHaveCount(0);
  await expectNoHorizontalScroll(page);
  await expectAccessible(page);
  await screenshotThemes(page, "reseller-page", "Revendedor");
  await screenshotThemes(page, "reseller-menu", "Revendedor", true);
});
