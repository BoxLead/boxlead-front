import type { Page } from "@playwright/test";
import { expect, expectAccessible, resetApi, screenshot, test } from "./support.ts";
import { MOCK_API_ORIGIN } from "./ports.ts";

const BUTTONS = [
  { name: "Botón de arrepentimiento", path: "/arrepentimiento" },
  { name: "Botón de baja de servicio", path: "/baja" },
];

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

async function screenshotThemes(page: Page, name: string, ready: (page: Page) => Promise<void>) {
  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme });
    await page.evaluate((value) => {
      document.documentElement.dataset.theme = value;
    }, theme);
    await ready(page);
    await screenshot(page, `${name}-${theme}`);
  }
}

function apiCalls(page: Page): string[] {
  const calls: string[] = [];
  page.on("request", (request) => {
    if (request.url().startsWith(MOCK_API_ORIGIN)) calls.push(`${request.method()} ${new URL(request.url()).pathname}`);
  });
  return calls;
}

test("the landing footer shows both buttons without a session or API calls", async ({ page }) => {
  test.slow();
  const calls = apiCalls(page);
  await page.goto("/");
  await expect(page.getByRole("banner").getByRole("navigation", { name: "Defensa del consumidor" })).toHaveCount(0);
  const footer = page.getByRole("contentinfo");
  const consumer = footer.getByRole("navigation", { name: "Defensa del consumidor" });
  await footer.scrollIntoViewIfNeeded();
  for (const { name, path } of BUTTONS) {
    await expect(consumer.getByRole("link", { name })).toHaveAttribute("href", path);
  }
  await expectNoHorizontalScroll(page);
  await screenshotThemes(page, "consumer-landing-footer", async () => {
    await consumer.scrollIntoViewIfNeeded();
  });
  await expect(
    footer.getByRole("link", { name: "Contratos de adhesión Ley N° 24.240 de Defensa del Consumidor" }),
  ).toHaveAttribute("href", "/contratos");
  const provider = footer.getByRole("region", { name: "Datos del proveedor" });
  await expect(provider).toContainText("Catvin SRL");
  await expect(provider.getByRole("link", { name: "support@boxlead.app" })).toHaveAttribute("href", "mailto:support@boxlead.app");
  await page.waitForLoadState("networkidle");
  expect(calls).toEqual([]);

  await consumer.getByRole("link", { name: "Botón de baja de servicio" }).click();
  await expect(page).toHaveURL(/\/baja$/);
  await expect(page.getByRole("heading", { level: 1, name: "Botón de baja de servicio" })).toBeVisible();
  expect(calls).toEqual([]);
});

test("a cancellation request answers with its code", async ({ page }) => {
  test.slow();
  await resetApi("billing-none");
  const calls = apiCalls(page);
  await page.goto("/baja");
  await expect(page).toHaveTitle(/^Botón de baja de servicio/);
  await expect(page.getByRole("heading", { level: 1, name: "Botón de baja de servicio" })).toBeVisible();
  await expectNoHorizontalScroll(page);
  await expectAccessible(page);
  await screenshotThemes(page, "consumer-cancellation-form", async () => {
    await expect(page.getByRole("button", { name: "Enviar pedido de baja" })).toBeVisible();
  });
  expect(calls).toEqual([]);

  await page.getByLabel("Email de tu cuenta").fill("ana@negocio.com");
  await page.getByLabel("Detalle (opcional)").fill("Ya no lo necesito");
  const sent = page.waitForRequest((request) => request.url().endsWith("/consumer-requests"));
  await page.getByRole("button", { name: "Enviar pedido de baja" }).click();
  expect((await sent).postDataJSON()).toEqual({ kind: "CANCELLATION", email: "ana@negocio.com", details: "Ya no lo necesito" });

  const receipt = page.getByRole("status").filter({ hasText: "Recibimos tu pedido" });
  await expect(receipt).toContainText(/BX-[0-9A-Z]+/);
  await expect(receipt).toContainText("ana@negocio.com");
  expect(calls).toEqual(["POST /consumer-requests"]);
  await expectNoHorizontalScroll(page);
  await expectAccessible(page);
  await screenshotThemes(page, "consumer-cancellation-sent", async () => {
    await expect(receipt).toBeVisible();
  });
});

test("a withdrawal request answers with its code", async ({ page }) => {
  await resetApi("billing-active");
  await page.goto("/arrepentimiento");
  await expect(page.getByRole("heading", { level: 1, name: "Botón de arrepentimiento" })).toBeVisible();
  await expect(page.getByRole("main")).toContainText("10 días corridos desde el primer cobro");
  await page.getByLabel("Email de tu cuenta").fill("demo@boxlead.app");
  const sent = page.waitForRequest((request) => request.url().endsWith("/consumer-requests"));
  await page.getByRole("button", { name: "Enviar pedido de arrepentimiento" }).click();
  expect((await sent).postDataJSON()).toEqual({ kind: "WITHDRAWAL", email: "demo@boxlead.app" });
  await expect(page.getByRole("status").filter({ hasText: "Recibimos tu pedido" })).toContainText(/BX-[0-9A-Z]+/);
});

test("a withdrawal request points to the support email when the API is down", async ({ page }) => {
  test.slow();
  await resetApi("billing-none");
  await page.route("**/consumer-requests", (route) => route.abort("connectionrefused"));
  await page.goto("/arrepentimiento");
  await page.getByLabel("Email de tu cuenta").fill("ana@negocio.com");
  await page.getByRole("button", { name: "Enviar pedido de arrepentimiento" }).click();
  const alert = page.getByRole("alert");
  await expect(alert).toContainText("No pudimos registrar tu pedido");
  await expect(alert.getByRole("link", { name: "support@boxlead.app" })).toHaveAttribute(
    "href",
    /^mailto:support@boxlead\.app\?subject=Bot%C3%B3n%20de%20arrepentimiento&body=Email%20de%20mi%20cuenta%20ana%40negocio\.com$/,
  );
  await expect(page.getByLabel("Email de tu cuenta")).toHaveValue("ana@negocio.com");
  await expectNoHorizontalScroll(page);
  await expectAccessible(page);
  await screenshotThemes(page, "consumer-withdrawal-down", async () => {
    await expect(alert).toBeVisible();
  });
});

test("a cancellation request points to the support email while core keeps the requests off", async ({ page }) => {
  await resetApi();
  await page.goto("/baja");
  await page.getByLabel("Email de tu cuenta").fill("ana@negocio.com");
  await page.getByRole("button", { name: "Enviar pedido de baja" }).click();
  await expect(page.getByRole("alert")).toContainText("support@boxlead.app");
  await expect(page.getByRole("status").filter({ hasText: "Recibimos tu pedido" })).toHaveCount(0);
});
