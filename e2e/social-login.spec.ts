import { expect, expectAccessible, GOOGLE_IDENTITY, resetApi, routeAuth0, test } from "./support.ts";

test.beforeEach(async () => {
  await resetApi();
});

test("the login and the sign up offer Google and Facebook next to the email form", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Continuar con Google" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continuar con Facebook" })).toBeVisible();
  await expect(page.locator('input[name="email"]')).toBeVisible();
  await expectAccessible(page);

  await page.goto("/register");
  await expect(page.getByRole("button", { name: "Continuar con Google" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continuar con Facebook" })).toBeVisible();
  await expect(page.locator('input[name="password"]')).toBeVisible();
});

test("logging in with Google starts a session in an httpOnly cookie", async ({ page }) => {
  const auth0 = await routeAuth0(page, { claims: GOOGLE_IDENTITY });
  await page.goto("/login");
  await page.getByRole("button", { name: "Continuar con Google" }).click();
  await expect(page).toHaveURL(/\/app\/inbox$/);
  expect(auth0.connections).toEqual(["google-oauth2"]);

  await page.reload();
  await expect(page).toHaveURL(/\/app\/inbox$/);
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  expect(await page.evaluate(() => document.cookie)).not.toContain("boxlead_session");
});

test("logging in with Facebook returns to the page the visitor was sent from", async ({ page }) => {
  const auth0 = await routeAuth0(page, { claims: { ...GOOGLE_IDENTITY, sub: "facebook|1" } });
  await page.goto("/app/leads?status=NEW");
  await expect(page).toHaveURL(/\/login\?next=/);
  await page.getByRole("button", { name: "Continuar con Facebook" }).click();
  await expect(page).toHaveURL(/\/app\/leads\?status=NEW$/);
  expect(auth0.connections).toEqual(["facebook"]);
});

test("signing up with Google works from the register page", async ({ page }) => {
  await routeAuth0(page, { claims: GOOGLE_IDENTITY });
  await page.goto("/register");
  await page.getByRole("button", { name: "Continuar con Google" }).click();
  await expect(page).toHaveURL(/\/app\/inbox$/);
});

test("an email the provider has not verified is refused", async ({ page }) => {
  await routeAuth0(page, { claims: { ...GOOGLE_IDENTITY, email_verified: false } });
  await page.goto("/login");
  await page.getByRole("button", { name: "Continuar con Google" }).click();
  await expect(page.getByRole("alert")).toContainText("A verified email is required");
  await expect(page).toHaveURL(/\/social\/callback/);
  await page.getByRole("link", { name: "Volver a iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test("cancelling at the provider explains it and offers to try again", async ({ page }) => {
  await routeAuth0(page, { error: "access_denied" });
  await page.goto("/login");
  await page.getByRole("button", { name: "Continuar con Google" }).click();
  await expect(page.getByRole("alert")).toContainText("Cancelaste el inicio de sesión");
  await expectAccessible(page);
});
