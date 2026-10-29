import type { Page } from "@playwright/test";
import { lastToken, sentEmails, setAccountOptions } from "./account-support.ts";
import { DEMO_EMAIL, expect, expectAccessible, resetApi, screenshot, test } from "./support.ts";

const heading = (page: Page, name: string) => page.getByRole("heading", { level: 1, name });

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

test.beforeEach(async () => {
  await resetApi();
});

test("with recovery off the login has no link and the page points to support", async ({ page }) => {
  await page.goto("/login");
  await expect(heading(page, "Iniciar sesión")).toBeVisible();
  await expect(page.getByRole("button", { name: "Ingresar" })).toBeVisible();
  await expect(page.getByRole("link", { name: "¿Olvidaste tu contraseña?" })).toHaveCount(0);

  await page.goto("/recuperar-clave");
  await expect(page.getByText("Por ahora la contraseña no se puede recuperar desde acá.")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Email" })).toHaveCount(0);
  await expectAccessible(page);
});

test("a recovery request always gets the same answer", async ({ page }) => {
  await setAccountOptions({ passwordReset: true });
  await page.goto("/login");
  await page.getByRole("link", { name: "¿Olvidaste tu contraseña?" }).click();
  await expect(heading(page, "Recuperar la contraseña")).toBeVisible();
  await expectNoHorizontalScroll(page);
  await expectAccessible(page);
  await screenshot(page, "recovery-request");

  await page.getByRole("textbox", { name: "Email" }).fill("nadie@negocio.com");
  await page.getByRole("button", { name: "Mandar el link" }).click();
  const answer = page.locator("p.recovery-notice");
  await expect(answer).toContainText("Si hay una cuenta con ese email");
  const unknownAnswer = await answer.textContent();
  expect(await sentEmails()).toEqual([]);

  await page.goto("/recuperar-clave");
  await page.getByRole("textbox", { name: "Email" }).fill(DEMO_EMAIL);
  await page.getByRole("button", { name: "Mandar el link" }).click();
  await expect(page.locator("p.recovery-notice")).toHaveText(unknownAnswer ?? "");
  await screenshot(page, "recovery-sent");
  expect((await sentEmails()).map((email) => email.template)).toEqual(["PASSWORD_RESET"]);
});

test("a recovery link sets a new password once and leaves the URL clean", async ({ page }) => {
  await setAccountOptions({ passwordReset: true });
  await page.goto("/recuperar-clave");
  await page.getByRole("textbox", { name: "Email" }).fill(DEMO_EMAIL);
  await page.getByRole("button", { name: "Mandar el link" }).click();
  await expect(page.locator("p.recovery-notice")).toBeVisible();
  const token = await lastToken("PASSWORD_RESET");

  await page.goto(`/nueva-clave#${token}`);
  await expect(heading(page, "Elegí una contraseña nueva")).toBeVisible();
  await expect(page).toHaveURL(/\/nueva-clave$/);
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain(token);
  await expectNoHorizontalScroll(page);
  await expectAccessible(page);
  await screenshot(page, "recovery-new-password");

  await page.locator('input[name="password"]').fill("corta");
  await page.getByRole("button", { name: "Guardar la contraseña" }).click();
  await expect(page).toHaveURL(/\/nueva-clave$/);
  await page.locator('input[name="password"]').fill("una-clave-nueva");
  await page.getByRole("button", { name: "Guardar la contraseña" }).click();
  await expect(page.locator("p.recovery-notice")).toContainText("cerramos las sesiones abiertas en otros dispositivos");
  await screenshot(page, "recovery-done");
  expect((await sentEmails()).map((email) => email.template)).toContain("PASSWORD_CHANGED");
  await page.getByRole("link", { name: "Iniciar sesión" }).click();
  await expect(heading(page, "Iniciar sesión")).toBeVisible();

  await page.goto(`/nueva-clave#${token}`);
  await page.locator('input[name="password"]').fill("otra-clave-nueva");
  await page.getByRole("button", { name: "Guardar la contraseña" }).click();
  await expect(page.getByRole("alert")).toContainText("Este link no sirve");
  await expect(page.getByRole("link", { name: "Pedir un link nuevo" })).toHaveAttribute("href", "/recuperar-clave");
});

test("a link without a token explains what to do", async ({ page }) => {
  await page.goto("/nueva-clave");
  await expect(page.getByRole("alert")).toContainText("Este link no sirve");
  await expectAccessible(page);
  await screenshot(page, "recovery-invalid");
});
