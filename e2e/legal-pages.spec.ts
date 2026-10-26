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

for (const doc of [
  {
    path: "/terminos",
    title: "Términos y condiciones",
    english: "/terms-of-service",
    englishTitle: "Terms of Service",
    clauses: ["Pagos con Mercado Pago", "Baja", "Arrepentimiento", "Cambios en estos términos"],
  },
  {
    path: "/privacidad",
    title: "Política de privacidad",
    english: "/privacy-policy",
    englishTitle: "Privacy Policy",
    clauses: ["Responsable", "Transferencias fuera de la Argentina", "Tus derechos"],
  },
]) {
  test(`${doc.path} is the Spanish version and ${doc.english} says that Spanish prevails`, async ({ page }) => {
    test.slow();
    const calls = apiCalls(page);
    await page.goto(doc.path);
    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { level: 1, name: doc.title })).toBeVisible();
    await expect(page.locator(".legal")).toHaveAttribute("lang", "es");
    await expect(main).toContainText(/Versión \d{4}-\d{2}/);
    for (const clause of doc.clauses) {
      await expect(main.getByRole("heading", { level: 2, name: new RegExp(`^\\d+\\. ${clause}$`) })).toBeVisible();
    }
    await expect(main).not.toContainText(/continuar usando|seguir usando BoxLead (implica|significa)/i);
    await expectNoHorizontalScroll(page);
    await expectAccessible(page);
    await screenshotThemes(page, `legal-${doc.path.slice(1)}`);

    await main.getByRole("link", { name: "traducción al inglés" }).click();
    await expect(page).toHaveURL(new RegExp(`${doc.english}$`));
    const english = page.getByRole("main");
    await expect(english.getByRole("heading", { level: 1, name: doc.englishTitle })).toBeVisible();
    await expect(page.locator(".legal")).toHaveAttribute("lang", "en");
    await expect(english).toContainText("translation for reference");
    await expect(english).not.toContainText(/Continued use/);
    await english.getByRole("link", { name: doc.title }).click();
    await expect(page).toHaveURL(new RegExp(`${doc.path}$`));
    expect(calls).toEqual([]);
  });
}

test("the privacy policy shows the AAIP notice", async ({ page }) => {
  await page.goto("/privacidad");
  await expect(page.getByRole("main")).toContainText("Órgano de Control de la Ley Nº 25.326");
  await expect(page.getByRole("link", { name: "AGENCIA DE ACCESO A LA INFORMACIÓN PÚBLICA" })).toHaveAttribute(
    "href",
    "https://www.argentina.gob.ar/aaip",
  );
});

test("the terms explain the full refund within ten days of the first charge", async ({ page }) => {
  await page.goto("/terminos");
  const main = page.getByRole("main");
  await expect(main).toContainText("10 días corridos contados desde el primer cobro");
  await expect(main).toContainText("Te devolvemos el total cobrado aunque ya hayas usado BoxLead");
  await expect(main).toContainText("dólares estadounidenses e incluye el IVA");
});
