import type { Page } from "@playwright/test";
import { sentEmails, setAccountOptions } from "./account-support.ts";
import { expect, expectAccessible, GOOGLE_IDENTITY, login, resetApi, routeAuth0, screenshot, test } from "./support.ts";

async function openDeletion(page: Page) {
  await page.getByRole("button", { name: "Borrar la cuenta" }).click();
  await expect(page.getByRole("dialog", { name: "¿Borrar tu cuenta?" })).toBeVisible();
}

test.beforeEach(async () => {
  await resetApi();
});

test("with deletion off the account page has no deletion section", async ({ page }) => {
  await setAccountOptions({ settings: true });
  await login(page, "/app/cuenta");
  await expect(page.getByRole("heading", { level: 1, name: "Tu cuenta" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Borrar la cuenta" })).toHaveCount(0);
});

test("a password account deletes with its password and the word", async ({ page }) => {
  await setAccountOptions({ settings: true, deletion: true });
  await login(page, "/app/cuenta");
  await openDeletion(page);
  const submit = page.getByRole("button", { name: "Borrar mi cuenta" });
  await expect(submit).toBeDisabled();
  await expectAccessible(page);
  await screenshot(page, "account-delete-dialog");

  await page.getByLabel("Tu contraseña").fill("incorrecta");
  await page.getByLabel("Escribí BORRAR para confirmar").fill("BORRAR");
  await submit.click();
  await expect(page.getByRole("alert")).toHaveText("La contraseña no es correcta.");

  await page.getByLabel("Tu contraseña").fill("demo1234");
  await submit.click();
  await expect(page).toHaveURL(/\/$/);
  expect((await sentEmails()).map((email) => email.template)).toContain("ACCOUNT_DELETED");
  await page.goto("/app/inbox");
  await expect(page).toHaveURL(/\/login\?next=/);
});

test("an open subscription stops the deletion and points to the cancellation", async ({ page }) => {
  await setAccountOptions({ settings: true, deletion: true, subscriptionOpen: true });
  await login(page, "/app/cuenta");
  await openDeletion(page);
  await page.getByLabel("Tu contraseña").fill("demo1234");
  await page.getByLabel("Escribí BORRAR para confirmar").fill("BORRAR");
  await page.getByRole("button", { name: "Borrar mi cuenta" }).click();
  await expect(page.getByRole("alert")).toContainText("Primero cancelá tu suscripción");
  await expect(page.getByRole("link", { name: "Pedir la baja" })).toHaveAttribute("href", "/baja");
  await screenshot(page, "account-delete-subscription");
});

test("a social account signs in again with its provider before deleting", async ({ page }) => {
  const auth0 = await routeAuth0(page, { claims: GOOGLE_IDENTITY });
  await setAccountOptions({ settings: true, deletion: true, socialOnly: true });
  await login(page, "/app/cuenta");
  await openDeletion(page);
  await expect(page.getByRole("button", { name: "Borrar mi cuenta" })).toBeDisabled();
  await page.getByRole("link", { name: "Entrar con Google" }).click();

  await expect(page).toHaveURL(/\/app\/cuenta\?borrar=1$/);
  expect(auth0.connections).toEqual(["google-oauth2"]);
  await expect(page.getByRole("dialog", { name: "¿Borrar tu cuenta?" })).toContainText("Ya confirmaste que sos vos.");
  await screenshot(page, "account-delete-social");
  await page.getByLabel("Escribí BORRAR para confirmar").fill("BORRAR");
  await page.getByRole("button", { name: "Borrar mi cuenta" }).click();
  await expect(page).toHaveURL(/\/$/);
});
