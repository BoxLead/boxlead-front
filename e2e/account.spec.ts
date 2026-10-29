import type { Page } from "@playwright/test";
import { lastToken, setAccountOptions } from "./account-support.ts";
import { expect, expectAccessible, login, resetApi, screenshot, test } from "./support.ts";

const heading = (page: Page, name: string) => page.getByRole("heading", { level: 1, name });

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

async function openAccountFromMenu(page: Page) {
  await page.getByRole("button", { name: "Cuenta" }).click();
  await page.getByRole("link", { name: "Tu cuenta" }).click();
  await expect(heading(page, "Tu cuenta")).toBeVisible();
}

test.beforeEach(async () => {
  await resetApi();
});

test("with the account page off there is no link and the address goes back to the app", async ({ page }) => {
  await login(page, "/app/inbox");
  await page.getByRole("button", { name: "Cuenta" }).click();
  await expect(page.getByRole("link", { name: "Tu cuenta" })).toHaveCount(0);
  await page.goto("/app/cuenta");
  await expect(page).toHaveURL(/\/app\/inbox$/);
});

test("the account shows the data, renames and changes the password", async ({ page }) => {
  await setAccountOptions({ settings: true, sessionRevocation: true });
  await login(page, "/app/inbox");
  await openAccountFromMenu(page);
  await expect(page.locator(".account-email").first()).toHaveText("demo@boxlead.app");
  await expect(page.getByRole("list", { name: "Formas de entrar" })).toContainText("Email y contraseña");
  await expectNoHorizontalScroll(page);
  await expectAccessible(page);
  await screenshot(page, "account");

  await page.getByLabel("Nombre").fill("Ana María Pérez");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByText("Guardaste tu nombre.")).toBeVisible();

  await page.getByRole("button", { name: "Cambiar la contraseña" }).click();
  await page.getByLabel("Contraseña actual").fill("incorrecta");
  await page.getByLabel("Contraseña nueva").fill("una-clave-nueva");
  await page.getByRole("button", { name: "Guardar la contraseña" }).click();
  await expect(page.getByRole("alert")).toHaveText("La contraseña actual no es correcta.");
  await screenshot(page, "account-password-error");
  await page.getByLabel("Contraseña actual").fill("demo1234");
  await page.getByRole("button", { name: "Guardar la contraseña" }).click();
  await expect(page.getByText("Cambiaste tu contraseña y cerramos las sesiones de los otros dispositivos.")).toBeVisible();
});

test("the email changes only after the new address confirms", async ({ page }) => {
  await setAccountOptions({ settings: true });
  await login(page, "/app/cuenta");
  await page.getByRole("button", { name: "Cambiar el email" }).click();
  await page.getByLabel("Email nuevo").fill("ana@otro.com");
  await page.getByLabel("Tu contraseña").fill("demo1234");
  await page.getByRole("button", { name: "Mandar el link" }).click();
  await expect(page.locator("p.account-note[role=status]")).toContainText("ana@otro.com");
  await screenshot(page, "account-email-pending");
  const token = await lastToken("EMAIL_CHANGE");

  await page.goto("about:blank");
  await page.goto(`/nuevo-email#${token}`);
  await expect(page.locator("p.auth-notice")).toContainText("tu cuenta ahora usa el email nuevo");
  await expect(page).toHaveURL(/\/nuevo-email$/);
  await expectAccessible(page);
  await screenshot(page, "email-change-confirmed");

  await page.goto("/app/cuenta");
  await expect(page.locator(".account-email").first()).toHaveText("ana@otro.com");
});

test("a social account has no password to change", async ({ page }) => {
  await setAccountOptions({ settings: true, socialOnly: true });
  await login(page, "/app/cuenta");
  await expect(page.getByRole("list", { name: "Formas de entrar" })).toHaveText("Google");
  await expect(page.getByRole("button", { name: "Cambiar la contraseña" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Cambiar el email" })).toHaveCount(0);
  await screenshot(page, "account-social");
});

test("closing every session sends the person to the login", async ({ page }) => {
  await setAccountOptions({ settings: true, sessionRevocation: true });
  await login(page, "/app/cuenta");
  await page.getByRole("button", { name: "Cerrar sesión en todos los dispositivos" }).click();
  await expect(page.getByRole("dialog")).toContainText("Vas a salir de BoxLead en todos lados");
  await screenshot(page, "account-sessions-dialog");
  await page.getByRole("button", { name: "Cerrar todas" }).click();
  await expect(heading(page, "Iniciar sesión")).toBeVisible();
});
