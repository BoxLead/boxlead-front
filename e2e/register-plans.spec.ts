import type { Page } from "@playwright/test";
import { INVITATION_TOKENS, INVITE_COOKIE, INVITED_EMAIL } from "./mock-api/billing.ts";
import { MOCK_API_ORIGIN } from "./ports.ts";
import {
  DEMO_EMAIL,
  expect,
  expectAccessible,
  GOOGLE_IDENTITY,
  mockApiUrl,
  resetApi,
  routeAuth0,
  screenshot,
  test,
} from "./support.ts";

const PASSWORD = "clave-segura-1";
const PLANS = "Elegí tu plan";
const LEGAL = "Leí y acepto los Términos y condiciones y la Política de privacidad.";

function planGroup(page: Page) {
  return page.getByRole("group", { name: PLANS });
}

async function setInvitation(page: Page, token: string) {
  await page.context().addCookies([{ name: INVITE_COOKIE, value: token, url: MOCK_API_ORIGIN }]);
}

async function fillAccount(page: Page, email?: string) {
  if (email) await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(PASSWORD);
}

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

async function screenshotThemes(page: Page, name: string, ready: () => Promise<void>) {
  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme });
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await ready();
    await screenshot(page, `${name}-${theme}`);
  }
}

for (const status of [404, 401, 500]) {
  test(`plans answering ${status} leave the sign up as today`, async ({ page }) => {
    await resetApi();
    if (status !== 404) {
      await page.route("**/billing/plans", (route) => route.fulfill({ status, json: { message: "No" } }));
    }
    await page.goto("/register?plan=STARTER");
    await expect(page.getByRole("heading", { name: "Crear cuenta" })).toBeVisible();
    await expect(planGroup(page)).toHaveCount(0);
    await expect(page.getByRole("checkbox")).toHaveCount(0);
    await expect(page.getByText("Al crear tu cuenta aceptás los")).toBeVisible();
    if (status === 500) await screenshotThemes(page, "register-billing-off", () => expect(page.locator('input[name="email"]')).toBeVisible());
    await fillAccount(page, "nueva@negocio.com");
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await expect(page).toHaveURL(/\/app\/inbox$/);
  });
}

test("a Starter sign up shows today's price and goes to its checkout", async ({ page }) => {
  await resetApi("billing-none");
  await page.goto("/register?plan=STARTER");
  const starter = page.getByRole("radio", { name: "Starter" });
  await expect(starter).toBeChecked();
  const group = planGroup(page);
  await expect(group).toContainText("$ 87.000");
  await expect(group).toContainText("PRECIO SIN IMPUESTOS NACIONALES $ 71.900,82");
  await expect(group).toContainText("Referencia USD 60 con IVA incluido");
  await expect(group.getByRole("link", { name: "Hablá con nosotros" })).toHaveAttribute("href", /^mailto:/);
  await expectNoHorizontalScroll(page);
  await expectAccessible(page);
  await screenshotThemes(page, "register-plans", () => expect(page.getByRole("radio", { name: "Starter" })).toBeChecked());

  await fillAccount(page, "nueva@negocio.com");
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByRole("alert")).toHaveText("Aceptá los términos y la política de privacidad para seguir.");
  await expect(page.getByRole("checkbox", { name: LEGAL })).toBeFocused();
  await page.getByRole("checkbox", { name: LEGAL }).check();
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page).toHaveURL(/\/app\/billing\?checkout=STARTER$/);
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  expect(await page.evaluate(() => JSON.stringify(sessionStorage))).not.toContain("STARTER");
});

test("the sign up asks for a plan before creating the account", async ({ page }) => {
  await resetApi("billing-none");
  await page.goto("/register");
  await expect(page.getByRole("radio", { checked: true })).toHaveCount(0);
  await fillAccount(page, "nueva@negocio.com");
  await page.getByRole("checkbox", { name: LEGAL }).check();
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(planGroup(page).getByRole("alert")).toHaveText("Elegí un plan para seguir.");
  await expect(page.getByRole("radio", { name: "Starter" })).toBeFocused();
  await page.getByRole("radio", { name: "Business" }).check();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page).toHaveURL(/\/app\/billing\?checkout=BUSINESS$/);
});

test("the beta opens with a valid invitation and keeps its email", async ({ page }) => {
  await resetApi("billing-none");
  await setInvitation(page, INVITATION_TOKENS.otherEmail);
  await page.goto("/register?plan=DEMO");
  const beta = page.getByRole("radio", { name: "Beta" });
  await expect(beta).toBeEnabled();
  await expect(beta).toBeChecked();
  const email = page.locator('input[name="email"]');
  await expect(email).toHaveValue(INVITED_EMAIL);
  await expect(email).toHaveAttribute("readonly", "");
  await expectAccessible(page);
  await screenshotThemes(page, "register-beta-invited", () => expect(page.getByRole("radio", { name: "Beta" })).toBeChecked());

  await fillAccount(page);
  await page.getByRole("checkbox", { name: LEGAL }).check();
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page).toHaveURL(/\/app\/inbox$/);
  const summary = await page.context().request.get(`${mockApiUrl()}/billing/summary`);
  expect((await summary.json()).plan?.code).toBe("DEMO");
});

test("the beta stays closed without an invitation and says how to ask for it", async ({ page }) => {
  await resetApi("billing-none");
  await page.goto("/register?plan=DEMO");
  const beta = page.getByRole("radio", { name: "Beta" });
  await expect(beta).toBeDisabled();
  await expect(beta).not.toBeChecked();
  await expect(planGroup(page)).toContainText("Es solo por invitación");
  await expect(page.locator('input[name="email"]')).toBeEditable();
});

test("an expired invitation keeps the beta closed", async ({ page }) => {
  await resetApi("billing-none");
  await setInvitation(page, INVITATION_TOKENS.invalid);
  await page.goto("/register?plan=DEMO");
  await expect(page.getByRole("radio", { name: "Beta" })).toBeDisabled();
  await expect(planGroup(page)).toContainText("Es solo por invitación");
  await expect(page.locator('input[name="email"]')).toHaveValue("");
});

test("signing up with Google keeps the chosen plan and the accepted terms", async ({ page }) => {
  await resetApi("billing-none");
  const auth0 = await routeAuth0(page, { claims: GOOGLE_IDENTITY });
  await page.goto("/register?plan=BUSINESS");
  await page.getByRole("button", { name: "Continuar con Google" }).click();
  await expect(page.getByRole("alert")).toHaveText("Aceptá los términos y la política de privacidad para seguir.");
  expect(auth0.connections).toEqual([]);
  await page.getByRole("checkbox", { name: LEGAL }).check();
  await page.getByRole("button", { name: "Continuar con Google" }).click();
  await expect(page).toHaveURL(/\/app\/billing\?checkout=BUSINESS$/);
  expect(auth0.connections).toEqual(["google-oauth2"]);
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
});

test("a social login on an account with a password explains how to get in", async ({ page }) => {
  await resetApi();
  await routeAuth0(page, { claims: { ...GOOGLE_IDENTITY, email: DEMO_EMAIL } });
  await page.goto("/login");
  await page.getByRole("button", { name: "Continuar con Google" }).click();
  await expect(page.getByRole("alert")).toHaveText("Ya tenés una cuenta con este email. Entrá con tu email y contraseña.");
  await expect(page).toHaveURL(/\/social\/callback/);
  await page.getByRole("link", { name: "Volver a iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test("the plans show their loading, empty and error states", async ({ page }) => {
  await resetApi("billing-none");
  let release: () => void = () => undefined;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/billing/plans", async (route) => {
    await held;
    await route.fallback();
  });
  await page.goto("/register");
  await expect(page.getByRole("status")).toBeVisible();
  await screenshot(page, "register-loading");
  release();
  await expect(planGroup(page)).toBeVisible();
  await page.unroute("**/billing/plans");

  await page.route("**/billing/plans", (route) => route.fulfill({ status: 200, json: [] }));
  await page.reload();
  await expect(page.getByText(/Por ahora no hay planes para elegir/)).toBeVisible();
  await expect(page.locator('input[name="email"]')).toBeVisible();
  await screenshotThemes(page, "register-plans-empty", () => expect(page.getByText(/Por ahora no hay planes/)).toBeVisible());
  await page.unroute("**/billing/plans");

  await page.route("**/invitations/current", (route) => route.fulfill({ status: 503, json: { message: "Down" } }));
  await page.reload();
  await expect(page.getByRole("radio", { name: "Beta" })).toBeDisabled();
  await expect(planGroup(page)).toContainText("No pudimos comprobar tu invitación");
  await screenshotThemes(page, "register-invitation-error", () => expect(planGroup(page)).toBeVisible());
});
