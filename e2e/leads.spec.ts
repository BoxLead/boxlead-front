import { expect, test } from "@playwright/test";
import { expectAccessible, login, resetApi, screenshot } from "./support.ts";

const funnel = (page: import("@playwright/test").Page) => page.getByRole("group", { name: "Filtrar por estado" });
const rows = (page: import("@playwright/test").Page) => page.locator("tbody tr");

test.beforeEach(async () => {
  await resetApi();
});

test("the funnel counts leads by status and filters the table", async ({ page }) => {
  await login(page, "/app/leads");
  await expect(funnel(page).getByRole("button", { name: /3\s*Nuevo/ })).toBeVisible();
  await expect(funnel(page).getByRole("button", { name: /1\s*Calificado/ })).toBeVisible();
  await expect(rows(page)).toHaveCount(5);
  await expectAccessible(page);
  await screenshot(page, "leads");

  await funnel(page).getByRole("button", { name: /Calificado/ }).click();
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page)).toContainText("sofi.decoraciones");
  await expect(page).toHaveURL(/status=QUALIFIED/);
});

test("MercadoLibre buyers without questions are opt-in", async ({ page }) => {
  await login(page, "/app/leads");
  await expect(page.getByText("CAROLINA_PZ")).toHaveCount(0);
  await page.getByLabel("Incluir compradores sin consulta previa (1)").click();
  await expect(page.getByLabel("Incluir compradores sin consulta previa (1)")).toBeChecked();
  await expect(rows(page).filter({ hasText: "CAROLINA_PZ" })).toContainText("Comprador");
});

test("search finds people by phone digits", async ({ page }) => {
  await login(page, "/app/leads");
  await page.getByRole("searchbox", { name: "Buscar leads" }).fill("5555-0142");
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page)).toContainText("Martín Herrera");
});

test("the status changes from the table and sticks", async ({ page }) => {
  await login(page, "/app/leads");
  await page.getByLabel("Estado de Martín Herrera").selectOption("QUALIFIED");
  await expect(page.getByRole("status").filter({ hasText: "Martín Herrera pasó a calificado." })).toBeVisible();
  await expect(funnel(page).getByRole("button", { name: /2\s*Calificado/ })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Estado de Martín Herrera")).toHaveValue("QUALIFIED");
});

test("a MercadoLibre buyer shows contact data from the order and the post-sale conversation", async ({ page }) => {
  await login(page, "/app/leads?buyers=1");
  await page.getByRole("link", { name: "CAROLINA_PZ" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "CAROLINA_PZ" })).toBeVisible();
  await expect(page.getByText("Comprador")).toBeVisible();
  await expect(page.getByRole("link", { name: "carolina.paz@example.com" })).toHaveAttribute("href", "mailto:carolina.paz@example.com");
  await expect(page.getByRole("button", { name: "Nueva conversación" })).toHaveCount(0);
  await expectAccessible(page);
  await screenshot(page, "lead-meli-buyer");

  await page.getByRole("link", { name: /Postventa/ }).click();
  await expect(page).toHaveURL(/\/app\/inbox\?id=/);
  await expect(page.getByRole("heading", { level: 2, name: "CAROLINA_PZ" })).toBeVisible();
});

test("a WhatsApp lead links to the chat on wa.me", async ({ page }) => {
  await login(page, "/app/leads");
  await page.getByRole("link", { name: "Martín Herrera" }).click();
  await expect(page.getByRole("link", { name: "+5491155550142" })).toHaveAttribute("href", "https://wa.me/5491155550142");
  await expect(page.getByLabel("Estado de Martín Herrera")).toHaveValue("CONTACTED");
});

test("an unknown lead explains itself", async ({ page }) => {
  await login(page, "/app/leads/00000000-0000-4000-8000-000000000000");
  await expect(page.getByText("No encontramos este lead")).toBeVisible();
});
