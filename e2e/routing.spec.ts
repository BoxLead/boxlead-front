import { expect, expectAccessible, login, resetApi, test } from "./support.ts";

test.beforeEach(async () => {
  await resetApi();
});

test("an unknown public path shows the 404 page with a way home", async ({ page }) => {
  await page.goto("/esto-no-existe");
  await expect(page).toHaveTitle("Página no encontrada · BoxLead");
  await expect(page.getByRole("heading", { level: 1, name: "No encontramos esta página" })).toBeFocused();
  await expectAccessible(page);
  await page.getByRole("link", { name: "Ir al inicio" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("an unknown app path keeps the shell and offers the inbox", async ({ page }) => {
  await login(page, "/app/no-existe");
  await expect(page.getByRole("complementary", { name: "Navegación principal" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "No encontramos esta página" })).toBeVisible();
  await page.getByRole("link", { name: "Ir a la bandeja" }).click();
  await expect(page).toHaveURL(/\/app\/inbox$/);
});

test("navigating announces the page, moves the focus to its heading and restores the scroll on back", async ({ page }) => {
  await login(page, "/app/leads");
  await page.getByRole("complementary", { name: "Navegación principal" }).getByRole("link", { name: "Métricas" }).click();
  await expect(page).toHaveTitle("Métricas · BoxLead");
  await expect(page.getByRole("heading", { level: 1, name: "Métricas" })).toBeFocused();
  await expect(page.getByRole("status").filter({ hasText: "Métricas, página cargada" })).toBeAttached();

  const content = page.locator(".layout-content");
  await content.evaluate((element) => {
    element.scrollTop = 400;
  });
  await page.getByRole("complementary", { name: "Navegación principal" }).getByRole("link", { name: "Leads" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Leads" })).toBeFocused();
  await page.goBack();
  await expect(page).toHaveURL(/\/app\/metrics$/);
  await expect.poll(() => content.evaluate((element) => element.scrollTop)).toBeGreaterThan(200);
});

test("the inbox search lives in the URL and the keyboard moves between conversations", async ({ page }) => {
  await login(page);
  const list = page.getByRole("list", { name: "Conversaciones" });
  await expect(list.getByRole("link")).toHaveCount(6);

  await page.keyboard.press("/");
  await expect(page.getByRole("searchbox", { name: "Buscar conversaciones" })).toBeFocused();
  await page.keyboard.type("martin");
  await expect(list.getByRole("link")).toHaveCount(2);
  await expect(page).toHaveURL(/q=martin/);
  await page.reload();
  await expect(page.getByRole("searchbox", { name: "Buscar conversaciones" })).toHaveValue("martin");
  await expect(list.getByRole("link")).toHaveCount(2);

  await page.keyboard.press("Escape");
  await page.keyboard.press("j");
  await expect(page).toHaveURL(/id=/);
  const firstId = new URL(page.url()).searchParams.get("id");
  await page.keyboard.press("j");
  await expect.poll(() => new URL(page.url()).searchParams.get("id")).not.toBe(firstId);
  await page.keyboard.press("k");
  await expect.poll(() => new URL(page.url()).searchParams.get("id")).toBe(firstId);
  await page.keyboard.press("Escape");
  await expect(page).not.toHaveURL(/id=/);
});

test("the leads search survives a reload through the URL", async ({ page }) => {
  await login(page, "/app/leads?q=mart");
  await expect(page.getByRole("searchbox", { name: "Buscar leads" })).toHaveValue("mart");
  await page.getByRole("searchbox", { name: "Buscar leads" }).fill("");
  await expect(page).not.toHaveURL(/q=/);
});
