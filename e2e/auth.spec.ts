import { expect, test } from "@playwright/test";
import { DEMO_EMAIL, DEMO_PASSWORD, login, resetApi } from "./support.ts";

test.beforeEach(async () => {
  await resetApi();
});

test("the landing does not ask the API for a session", async ({ page }) => {
  const sessionChecks: string[] = [];
  page.on("request", (request) => {
    if (request.url().endsWith("/auth/me")) sessionChecks.push(request.url());
  });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  expect(sessionChecks).toEqual([]);
});

test("protected routes send anonymous visitors to the login and back", async ({ page }) => {
  await page.goto("/app/leads?status=NEW");
  await expect(page).toHaveURL(/\/login\?next=%2Fapp%2Fleads%3Fstatus%3DNEW$/);
  await page.locator('input[name="email"]').fill(DEMO_EMAIL);
  await page.locator('input[name="password"]').fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/app\/leads\?status=NEW$/);
});

test("an external next parameter is ignored", async ({ page }) => {
  await page.goto("/login?next=https%3A%2F%2Fevil.test%2Fapp");
  await page.locator('input[name="email"]').fill(DEMO_EMAIL);
  await page.locator('input[name="password"]').fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/app\/inbox$/);
});

test("a wrong password shows the API error and keeps the user on the login", async ({ page }) => {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(DEMO_EMAIL);
  await page.locator('input[name="password"]').fill("incorrecta");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page.getByRole("alert")).toContainText("Invalid email or password");
  await expect(page).toHaveURL(/\/login$/);
});

test("the session lives in an httpOnly cookie and survives a reload", async ({ page }) => {
  await login(page, "/app/leads");
  await page.reload();
  await expect(page).toHaveURL(/\/app\/leads$/);
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  expect(await page.evaluate(() => document.cookie)).not.toContain("boxlead_session");
});

test("logging out ends the session", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: "Cuenta" }).click();
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/app/inbox");
  await expect(page).toHaveURL(/\/login\?next=%2Fapp%2Finbox$/);
});

test("the account menu switches theme and the rail collapses to icons", async ({ page }, testInfo) => {
  await login(page);
  await page.getByRole("button", { name: "Cuenta" }).click();
  const dialog = page.getByRole("dialog", { name: "Cuenta" });
  await expect(dialog).toContainText("Ana Pérez");
  const root = page.locator("html");
  const wasLight = (await root.getAttribute("data-theme")) === "light";
  await dialog.getByRole("switch", { name: "Modo claro" }).click();
  const next = wasLight ? "dark" : "light";
  await expect(root).toHaveAttribute("data-theme", next);
  await page.reload();
  await expect(root).toHaveAttribute("data-theme", next);

  if (testInfo.project.name !== "desktop") return;

  await page.getByRole("button", { name: "Contraer menú" }).click();
  await expect(root).toHaveAttribute("data-sidebar", "collapsed");
  await expect(page.locator(".sidebar")).toHaveCSS("width", "72px");
  await page.getByRole("link", { name: "Métricas" }).click();
  await expect(page).toHaveURL(/\/app\/metrics$/);
  await expect(page.getByRole("link", { name: "BoxLead" })).toBeVisible();
});
