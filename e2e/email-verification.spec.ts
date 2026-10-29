import type { Page } from "@playwright/test";
import { lastToken, sentEmails, setAccountOptions } from "./account-support.ts";
import { expect, expectAccessible, login, resetApi, screenshot, test } from "./support.ts";

const heading = (page: Page, name: string) => page.getByRole("heading", { level: 1, name });

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

test.beforeEach(async () => {
  await resetApi();
});

test("an older account that never confirmed keeps using the app", async ({ page }) => {
  await setAccountOptions({ emailVerification: true });
  await login(page, "/app/leads");
  await expect(heading(page, "Leads")).toBeVisible();
  await expect(heading(page, "Confirmá tu email")).toHaveCount(0);
});

test("a new account sees only the confirmation until the link is used", async ({ page }) => {
  await setAccountOptions({ emailVerification: true, emailPending: true });
  await login(page, "/app/leads");
  await expect(heading(page, "Confirmá tu email")).toBeVisible();
  await expect(page.locator(".email-gate-email")).toHaveText("demo@boxlead.app");
  await expectNoHorizontalScroll(page);
  await expectAccessible(page);
  await screenshot(page, "email-gate");

  await page.getByRole("button", { name: "Mandar el link de nuevo" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Te mandamos un link nuevo" })).toBeVisible();
  expect((await sentEmails()).filter((email) => email.template === "EMAIL_VERIFICATION")).toHaveLength(2);
  const token = await lastToken("EMAIL_VERIFICATION");

  await page.goto(`/confirmar-email#${token}`);
  await expect(page.locator("p.auth-notice")).toHaveText("Listo, confirmaste tu email.");
  await expect(page).toHaveURL(/\/confirmar-email$/);
  await expectAccessible(page);
  await screenshot(page, "email-confirmed");
  await page.getByRole("link", { name: "Ir a BoxLead" }).click();
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  await expect(heading(page, "Confirmá tu email")).toHaveCount(0);
});

test("a used or missing confirmation link explains what to do", async ({ page }) => {
  await setAccountOptions({ emailVerification: true, emailPending: true });
  const token = await lastToken("EMAIL_VERIFICATION");
  await page.goto(`/confirmar-email#${token}`);
  await expect(page.locator("p.auth-notice")).toHaveText("Listo, confirmaste tu email.");

  await page.goto("about:blank");
  await page.goto(`/confirmar-email#${token}`);
  await expect(page.getByRole("alert")).toContainText("Este link no sirve");
  await screenshot(page, "email-confirm-invalid");

  await page.goto("about:blank");
  await page.goto("/confirmar-email");
  await expect(page.getByRole("alert")).toContainText("Este link no sirve");
});
