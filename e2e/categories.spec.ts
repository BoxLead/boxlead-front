import { expect, test, type Page } from "@playwright/test";
import { expectAccessible, login, resetApi, screenshot } from "./support.ts";

const cards = (page: Page) => page.getByRole("list", { name: "Categorías" }).locator(":scope > li");
const card = (page: Page, name: string) =>
  page.getByRole("list", { name: "Categorías" }).getByRole("listitem").filter({ has: page.getByRole("heading", { name, exact: true }) });

test.beforeEach(async () => {
  await resetApi();
});

test("every account starts with the four default categories", async ({ page }) => {
  await login(page, "/app/categories");
  await expect(cards(page)).toHaveCount(4);
  await expect(cards(page).locator("h2")).toHaveText(["Consulta", "Presupuesto", "Postventa", "Reclamo"]);
  await expect(card(page, "Consulta")).toContainText("1 lead");
  await expect(card(page, "Reclamo")).toContainText("0 leads");
  await expect(card(page, "Presupuesto")).toContainText("Pedidos de precio");
  await expectAccessible(page);
  await screenshot(page, "categories");
});

test("creates a category with a description and a color", async ({ page }) => {
  await login(page, "/app/categories");
  await page.getByRole("button", { name: "Nueva categoría" }).click();
  const dialog = page.getByRole("dialog", { name: "Nueva categoría" });
  await expect(dialog.getByRole("button", { name: "Crear categoría" })).toBeDisabled();
  await dialog.getByLabel("Nombre").fill("Mayorista");
  await dialog.getByLabel("Descripción").fill("Compras por volumen para revender.");
  await dialog.getByRole("radio", { name: "Naranja" }).check();
  await expectAccessible(page);
  await screenshot(page, "category-dialog");
  await dialog.getByRole("button", { name: "Crear categoría" }).click();

  await expect(page.getByRole("status").filter({ hasText: "Creaste Mayorista." })).toBeVisible();
  await expect(card(page, "Mayorista")).toContainText("Compras por volumen para revender.");
  await expect(card(page, "Mayorista")).toHaveClass(/category-color-orange/);
});

test("names must be unique and fit in 40 characters", async ({ page }) => {
  await login(page, "/app/categories");
  await page.getByRole("button", { name: "Nueva categoría" }).click();
  const dialog = page.getByRole("dialog", { name: "Nueva categoría" });
  await dialog.getByLabel("Nombre").fill("x".repeat(41));
  await expect(dialog.getByText("41 / 40")).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Crear categoría" })).toBeDisabled();

  await dialog.getByLabel("Nombre").fill("  consulta ");
  await dialog.getByRole("button", { name: "Crear categoría" }).click();
  await expect(dialog.getByRole("alert")).toHaveText("Ya tenés una categoría con ese nombre.");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Cancelar" }).click();
  await expect(dialog).toBeHidden();
  await expect(cards(page)).toHaveCount(4);
});

test("edits a default category", async ({ page }) => {
  await login(page, "/app/categories");
  await page.getByRole("button", { name: "Editar Consulta" }).click();
  const dialog = page.getByRole("dialog", { name: "Editar categoría" });
  await expect(dialog.getByLabel("Nombre")).toHaveValue("Consulta");
  await dialog.getByLabel("Nombre").fill("Consultas generales");
  await dialog.getByLabel("Descripción").fill("");
  await dialog.getByRole("radio", { name: "Amarillo" }).check();
  await dialog.getByRole("button", { name: "Guardar cambios" }).click();

  await expect(page.getByRole("status").filter({ hasText: "Guardaste Consultas generales." })).toBeVisible();
  await expect(card(page, "Consultas generales")).toContainText("Sin descripción");
  await expect(card(page, "Consultas generales")).toHaveClass(/category-color-yellow/);
});

test("deleting a category leaves its leads without one", async ({ page }) => {
  await login(page, "/app/categories");
  await page.getByRole("button", { name: "Eliminar Presupuesto" }).click();
  const dialog = page.getByRole("dialog", { name: "¿Eliminar Presupuesto?" });
  await expect(dialog).toContainText("El lead asignado queda sin categoría.");
  await dialog.getByRole("button", { name: "Eliminar" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Eliminaste Presupuesto." })).toBeVisible();
  await expect(cards(page)).toHaveCount(3);

  await page.goto("/app/leads");
  await expect(page.getByLabel("Categoría de Martín Herrera")).toHaveValue("");
});

test("the lead count opens the leads of that category, buyers included", async ({ page }) => {
  await login(page, "/app/categories");
  await card(page, "Postventa").getByRole("link", { name: "1 lead" }).click();
  await expect(page).toHaveURL(/\/app\/leads\?category=.+&buyers=1$/);
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("tbody tr")).toContainText("CAROLINA_PZ");
});

test("an account without categories is invited to create one", async ({ page }) => {
  await login(page, "/app/categories");
  for (const name of ["Consulta", "Presupuesto", "Postventa", "Reclamo"]) {
    await page.getByRole("button", { name: `Eliminar ${name}` }).click();
    await page.getByRole("dialog", { name: `¿Eliminar ${name}?` }).getByRole("button", { name: "Eliminar" }).click();
    await expect(page.getByRole("button", { name: `Eliminar ${name}` })).toHaveCount(0);
  }
  await expect(page.getByText("Creá tu primera categoría")).toBeVisible();
  await expect(page.getByRole("button", { name: "Nueva categoría" })).toBeEnabled();
});
