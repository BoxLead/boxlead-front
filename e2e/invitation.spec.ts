import type { Page } from "@playwright/test";
import { INVITATION_TOKENS } from "./mock-api/billing.ts";
import { expect, expectAccessible, login, resetApi, screenshot, test } from "./support.ts";

const heading = (page: Page, name: string) => page.getByRole("heading", { level: 1, name });

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

async function expectTokenGone(page: Page, token: string) {
  await expect(page).toHaveURL(/\/invitacion$/);
  const stored = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }) + window.location.href);
  expect(stored).not.toContain(token);
}

async function shootThemes(page: Page, name: string, token: string, title: string) {
  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme });
    await page.goto("about:blank");
    await page.goto(`/invitacion#${token}`);
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await expect(heading(page, title)).toBeVisible();
    await screenshot(page, `${name}-${theme}`);
  }
}

test.beforeEach(async () => {
  await resetApi("billing-none");
});

test("a valid invitation shows the email, leaves the URL clean and offers both ways in", async ({ page }) => {
  await page.goto(`/invitacion#${INVITATION_TOKENS.valid}`);
  await expect(heading(page, "Te invitaron a la Beta de BoxLead")).toBeVisible();
  await expect(page.getByText("demo@boxlead.app")).toBeVisible();
  await expectTokenGone(page, INVITATION_TOKENS.valid);
  await expect(page.getByRole("link", { name: "Crear mi cuenta" })).toHaveAttribute("href", "/register?plan=DEMO");
  await expect(page.getByRole("link", { name: "Iniciar sesión" })).toHaveAttribute("href", "/login");
  await expectNoHorizontalScroll(page);
  await expectAccessible(page);
  await shootThemes(page, "invitation-valid", INVITATION_TOKENS.valid, "Te invitaron a la Beta de BoxLead");
});

test("an invalid, expired or missing token gets the same answer", async ({ page }) => {
  await page.goto(`/invitacion#${INVITATION_TOKENS.invalid}`);
  await expect(heading(page, "Esta invitación no sirve")).toBeVisible();
  await expectTokenGone(page, INVITATION_TOKENS.invalid);
  await expect(page.getByRole("link", { name: "Ir al inicio" })).toHaveAttribute("href", "/");
  await expectAccessible(page);
  await shootThemes(page, "invitation-invalid", INVITATION_TOKENS.invalid, "Esta invitación no sirve");

  await page.goto("/invitacion");
  await expect(heading(page, "Esta invitación no sirve")).toBeVisible();
});

test("a failed check can be retried with the token kept in memory", async ({ page }) => {
  let release: () => void = () => undefined;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let calls = 0;
  await page.route("**/invitations/preview", async (route) => {
    calls += 1;
    if (calls === 1) {
      await held;
      return route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "x", message: "x" }) });
    }
    return route.fallback();
  });
  await page.goto(`/invitacion#${INVITATION_TOKENS.valid}`);
  await expect(page.getByText("Estamos revisando tu invitación.")).toBeVisible();
  await expectTokenGone(page, INVITATION_TOKENS.valid);
  await screenshot(page, "invitation-loading-light");
  release();
  await expect(heading(page, "No pudimos revisar tu invitación")).toBeVisible();
  await expect(page.getByRole("alert")).toHaveText("Revisá tu conexión y probá de nuevo.");
  await screenshot(page, "invitation-error-light");
  await page.getByRole("button", { name: "Reintentar" }).click();
  await expect(heading(page, "Te invitaron a la Beta de BoxLead")).toBeVisible();
});

test("with a session the invitation is accepted on purpose", async ({ page }) => {
  await login(page);
  await page.goto(`/invitacion#${INVITATION_TOKENS.valid}`);
  await expect(page.getByText("Entraste como")).toContainText("demo@boxlead.app");
  await expectTokenGone(page, INVITATION_TOKENS.valid);
  await expectAccessible(page);
  await shootThemes(page, "invitation-session", INVITATION_TOKENS.valid, "Te invitaron a la Beta de BoxLead");
  await page.getByRole("button", { name: "Activar la Beta en esta cuenta" }).click();
  await expect(page).toHaveURL(/\/app\/inbox$/);
  await expect(page.getByText("Activaste la Beta.")).toBeVisible();
  await expect(page.locator(".plan-banners")).toHaveCount(0);
});

test("with a session on another email the mismatch is explained", async ({ page }) => {
  await login(page);
  await page.goto(`/invitacion#${INVITATION_TOKENS.otherEmail}`);
  await expect(page.getByText("ana@negocio.com")).toBeVisible();
  await page.getByRole("button", { name: "Activar la Beta en esta cuenta" }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "Esta invitación es para ana@negocio.com. Salí y entrá con ese email para activar la Beta.",
  );
  await expectNoHorizontalScroll(page);
  await screenshot(page, "invitation-mismatch-light");
  await page.getByRole("button", { name: "Entrar con otro email" }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test("an account that already used the demo is told so", async ({ page }) => {
  await resetApi("billing-demo");
  await login(page);
  await page.goto(`/invitacion#${INVITATION_TOKENS.valid}`);
  await page.getByRole("button", { name: "Activar la Beta en esta cuenta" }).click();
  await expect(page.getByRole("alert")).toHaveText("Ya usaste la Beta con esta cuenta. Elegí un plan para seguir.");
  await screenshot(page, "invitation-demo-used-light");
});
