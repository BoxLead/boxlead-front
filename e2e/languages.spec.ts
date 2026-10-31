import { expect, expectAccessible, login, resetApi, screenshot, test } from "./support.ts";

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

test.describe("the app with an English browser", () => {
  test.use({ locale: "en-US" });

  test.beforeEach(async () => {
    await resetApi();
  });

  test("the login and the app follow the browser language", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sign in");
    await login(page, "/app/inbox");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    const nav = page.getByRole("complementary", { name: "Main navigation" });
    await expect(nav.getByRole("link", { name: "Metrics" })).toBeVisible();
    await expectAccessible(page);
    await screenshot(page, "app-inbox-en");
  });

  test("the account page switches the language and keeps it after a reload", async ({ page }) => {
    await login(page, "/app/cuenta");
    await page.getByRole("combobox", { name: "Language" }).selectOption("es");
    const nav = page.getByRole("complementary", { name: "Navegación principal" });
    await expect(nav.getByRole("link", { name: "Métricas" })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "es-AR");
    await page.reload();
    await expect(page.getByRole("complementary", { name: "Navegación principal" })).toBeVisible();
    await page.getByRole("combobox", { name: "Idioma" }).selectOption("en");
    await expect(page.getByRole("complementary", { name: "Main navigation" })).toBeVisible();
  });
});

test("a Spanish browser keeps the app in Spanish", async ({ page }) => {
  await resetApi();
  await login(page, "/app/inbox");
  await expect(page.locator("html")).toHaveAttribute("lang", "es-AR");
  await expect(page.getByRole("complementary", { name: "Navegación principal" }).getByRole("link", { name: "Métricas" })).toBeVisible();
  await screenshot(page, "app-inbox-es");
});

const ENGLISH_SCREENS = [
  { path: "/login", title: "Sign in · BoxLead", heading: "Sign in" },
  { path: "/register", title: "Create account · BoxLead", heading: "Create account" },
  { path: "/recuperar-clave", title: "Reset your password · BoxLead", heading: "Reset your password" },
  { path: "/nueva-clave", title: "Choose a new password · BoxLead", heading: "Choose a new password" },
  { path: "/confirmar-email", title: "Confirm your email · BoxLead", heading: "Confirm your email" },
  { path: "/nuevo-email", title: "Confirm the new email · BoxLead", heading: "Confirm the new email" },
  { path: "/reingresar", title: "Confirm it's you · BoxLead", heading: "Confirm it's you" },
  { path: "/avisos/baja", title: "Stop receiving notices · BoxLead", heading: "Stop receiving notices" },
  { path: "/arrepentimiento", title: "Withdrawal button · BoxLead", heading: "Withdrawal button" },
  { path: "/baja", title: "Cancellation button · BoxLead", heading: "Cancellation button" },
  { path: "/esto-no-existe", title: "Page not found · BoxLead", heading: "We couldn't find this page" },
];

test.describe("screens without an /en address with an English browser", () => {
  test.use({ locale: "en-US" });

  for (const { path, title, heading } of ENGLISH_SCREENS) {
    test(`${path} is in English with its title`, async ({ page }) => {
      await resetApi();
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
      await expect(page).toHaveTitle(title);
      await expect(page.locator("html")).toHaveAttribute("lang", "en");
    });
  }

  test("the cancellation form works in English", async ({ page }) => {
    await resetApi("billing-none");
    await page.goto("/baja");
    await page.getByLabel("Your account email").fill("ana@negocio.com");
    await page.getByRole("button", { name: "Send cancellation request" }).click();
    await expect(page.getByRole("status").filter({ hasText: "We got your request" })).toContainText("ana@negocio.com");
    await expect(page.getByRole("contentinfo").getByRole("link", { name: "Withdrawal button" })).toHaveAttribute("href", "/arrepentimiento");
    await expectAccessible(page);
  });
});

test("reading the English site keeps the login in English for the session", async ({ page }) => {
  await resetApi();
  await page.goto("/en");
  await page.getByRole("contentinfo").getByRole("link", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sign in");
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sign in");
});

test("the Spanish browser keeps the screens without an /en address in Spanish", async ({ page }) => {
  await resetApi();
  await page.goto("/arrepentimiento");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Botón de arrepentimiento");
  await expect(page).toHaveTitle("Botón de arrepentimiento · BoxLead");
  await page.goto("/login");
  await expect(page).toHaveTitle("Iniciar sesión · BoxLead");
});
