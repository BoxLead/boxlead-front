import { expect, test } from "@playwright/test";
import { DEMO_EMAIL, login, resetApi } from "./support.ts";

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

test("protected routes send anonymous visitors to the login", async ({ page }) => {
  await page.goto("/app/leads");
  await expect(page).toHaveURL(/\/login$/);
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
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/app/inbox");
  await expect(page).toHaveURL(/\/login$/);
});
