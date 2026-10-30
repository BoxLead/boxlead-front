import { expect, expectAccessible, screenshot, test } from "./support.ts";

test("the landing in English lives under /en with its own language and alternates", async ({ page }) => {
  await page.goto("/en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Grow your sales");
  await expect(page).toHaveTitle("AI agent that sells on WhatsApp, Instagram and MercadoLibre · BoxLead");
  await expect(page.locator(`link[rel="alternate"][hreflang="es-AR"]`)).toHaveAttribute("href", "https://boxlead.app/");
  await expect(page.locator(`link[rel="alternate"][hreflang="en"]`)).toHaveAttribute("href", "https://boxlead.app/en");
  await expect(page.getByRole("contentinfo").getByRole("link", { name: "Terms of Service" })).toHaveAttribute("href", "/terms-of-service");
  await expect(page.getByRole("contentinfo").getByRole("link", { name: "WhatsApp Business" })).toHaveAttribute("href", "/en/whatsapp");
  await expectAccessible(page);
  await screenshot(page, "landing-en");
});

test("the Spanish landing keeps its text and links to the English version", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "es-AR");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Escalá tus ventas");
  await expect(page.locator(`link[rel="alternate"][hreflang="en"]`)).toHaveAttribute("href", "https://boxlead.app/en");
  await expect(page.getByRole("banner").getByRole("link", { name: "English" })).toHaveAttribute("href", "/en");
});

test("the language switch moves between the two versions of a page", async ({ page }) => {
  await page.goto("/whatsapp");
  await page.getByRole("banner").getByRole("link", { name: "English" }).click();
  await expect(page).toHaveURL(/\/en\/whatsapp$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("An AI agent that answers your WhatsApp Business around the clock");
  await page.getByRole("contentinfo").getByRole("link", { name: "Español" }).click();
  await expect(page).toHaveURL(/\/whatsapp$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "es-AR");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Un agente de IA que atiende tu WhatsApp Business las 24 horas");
});

test("links inside the English pages stay in English", async ({ page }) => {
  await page.goto("/en");
  await page.locator("#faq").scrollIntoViewIfNeeded();
  await page.getByText("Which channels does it work with?").click();
  await page.locator("#faq").getByRole("link", { name: "Instagram", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/instagram$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Instagram direct messages and comments, answered by your agent");
});
