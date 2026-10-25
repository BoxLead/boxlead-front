import type { Page, Response } from "@playwright/test";
import type { BillingOptions } from "./mock-api/billing.ts";
import type { Scenario } from "./mock-api/fixtures.ts";
import { expect, expectAccessible, login, resetApi, screenshot, test } from "./support.ts";

const DAY_MS = 24 * 60 * 60 * 1000;
const notices = (page: Page) => page.locator(".plan-banners");
const notice = (page: Page, title: string) => notices(page).getByRole("status").or(notices(page).getByRole("alert")).filter({ hasText: title });
const agentList = (page: Page) => page.getByRole("list", { name: "Agentes" });
const editor = (page: Page) => page.getByRole("form", { name: "Configuración del agente" });
const playground = (page: Page) => page.locator(".playground");

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

async function shootThemes(page: Page, name: string, ready: () => Promise<void>) {
  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme });
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await ready();
    await screenshot(page, `${name}-${theme}`);
  }
}

async function openAgentsWith(page: Page, scenario: Scenario, options: BillingOptions = {}) {
  await resetApi(scenario, undefined, options);
  await login(page, "/app/agents");
  await expect(page.getByRole("heading", { level: 1, name: "Agentes" })).toBeVisible();
}

async function openAgent(page: Page, name: string) {
  const back = page.getByRole("button", { name: "Volver" });
  if (await back.isVisible()) await back.click();
  await agentList(page).getByRole("button", { name: new RegExp(`^${name}(\\s|$)`) }).click();
  await expect(page.getByRole("heading", { level: 2, name, exact: true })).toBeVisible();
}

const STATES: { scenario: Scenario; title: string; link: string; href: RegExp; options?: BillingOptions; daysAhead?: number }[] = [
  { scenario: "billing-none", title: "No tenés un plan activo", link: "Elegir un plan", href: /^\/app\/billing$/ },
  {
    scenario: "billing-past-due",
    title: "No pudimos cobrar tu plan",
    link: "Cambiar medio de pago",
    href: /^https:\/\/www\.mercadopago\.com\.ar\//,
  },
  {
    scenario: "billing-suspended",
    title: "Tu plan está suspendido",
    link: "Cambiar medio de pago",
    href: /^https:\/\/www\.mercadopago\.com\.ar\//,
  },
  {
    scenario: "billing-active",
    title: "Tus agentes usaron todas las respuestas del plan",
    link: "Ver planes",
    href: /^\/app\/billing$/,
    options: { agentReplies: 1000 },
  },
  { scenario: "billing-demo", title: "Tu Beta termina pronto", link: "Elegir un plan", href: /^\/app\/billing$/, daysAhead: 4 },
];

for (const state of STATES) {
  test(`${state.scenario} shows ${state.title}`, async ({ page }) => {
    test.slow();
    if (state.daysAhead) await page.clock.setFixedTime(new Date(Date.now() + state.daysAhead * DAY_MS));
    await resetApi(state.scenario, undefined, state.options);
    await login(page);
    const inbox = page.getByRole("list", { name: "Conversaciones" });
    await expect(inbox).toBeVisible();
    const banner = notice(page, state.title);
    await expect(banner).toBeVisible();
    await expect(banner.getByRole("link", { name: state.link })).toHaveAttribute("href", state.href);
    await expect(notices(page).locator(".banner")).toHaveCount(1);
    await expectNoHorizontalScroll(page);
    await expectAccessible(page);
    await shootThemes(page, `plan-${state.scenario}${state.options ? "-limit" : ""}`, async () => {
      await expect(inbox).toBeVisible();
      await expect(banner).toBeVisible();
    });
  });
}

test("an active plan with room left shows no notice and the demo far from its end neither", async ({ page }) => {
  await resetApi("billing-active");
  const invitationChecked = page.waitForResponse((response) => response.url().endsWith("/invitations/current"));
  await login(page);
  await invitationChecked;
  await expect(page.getByRole("heading", { level: 1, name: "Bandeja" })).toBeVisible();
  await expect(notices(page)).toHaveCount(0);

  await resetApi("billing-demo");
  const summaryLoaded = page.waitForResponse((response) => response.url().endsWith("/billing/summary"));
  await page.reload();
  await summaryLoaded;
  await expect(page.getByRole("heading", { level: 1, name: "Bandeja" })).toBeVisible();
  await expect(notices(page)).toHaveCount(0);
});

test("with billing off nothing new is asked or shown", async ({ page }) => {
  const asked: string[] = [];
  page.on("request", (request) => {
    if (/\/(billing|invitations|legal)\//.test(request.url())) asked.push(request.url());
  });
  await resetApi("agents");
  await login(page, "/app/agents");
  await expect(page.getByRole("heading", { level: 1, name: "Agentes" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: "Nuevo agente" })).toBeEnabled();
  await page.goto("/app/metrics");
  await expect(page.getByRole("group", { name: "Período" }).getByRole("button", { name: "90 días" })).toBeVisible();
  await expect(notices(page)).toHaveCount(0);
  expect(asked).toEqual([]);
});

test("without a plan the agents, the playground and the composer explain why they are off", async ({ page }) => {
  test.slow();
  await openAgentsWith(page, "billing-none");
  await expect(notice(page, "No tenés un plan activo")).toBeVisible();
  await expect(page.getByRole("button", { name: "Nuevo agente" })).toBeDisabled();
  await openAgent(page, "Ventas");
  await page.getByRole("button", { name: "Probar" }).click();
  await expect(playground(page).getByText("Necesitás un plan para probar agentes")).toBeVisible();
  await expect(playground(page).getByPlaceholder("Mensaje del cliente")).toBeDisabled();
  await expectNoHorizontalScroll(page);
  await expectAccessible(page);
  await shootThemes(page, "plan-none-playground", () => expect(playground(page).getByText("Necesitás un plan para probar agentes")).toBeVisible());

  await page.goto("/app/inbox");
  const back = page.getByRole("link", { name: "Volver a la lista" });
  if (await back.isVisible()) await back.click();
  await page.getByRole("list", { name: "Conversaciones" }).getByRole("link", { name: /Martín Herrera/ }).click();
  await expect(page.getByText("Necesitás un plan para responder")).toBeVisible();
  await expect(page.getByLabel("Responder a Martín Herrera")).toHaveCount(0);
  await expectNoHorizontalScroll(page);
  await shootThemes(page, "plan-none-inbox", () => expect(page.getByText("Necesitás un plan para responder")).toBeVisible());
});

test("agents beyond the plan are marked and explained", async ({ page }) => {
  await openAgentsWith(page, "billing-demo");
  await expect(page.getByText("Algunos agentes quedaron fuera de tu plan")).toBeVisible();
  await expect(page.getByText("Tu plan permite 1 agente activo. Postventa no responde hasta que pauses otro agente o cambies de plan.")).toBeVisible();
  await expect(agentList(page).getByRole("button", { name: /^Postventa/ })).toContainText("Fuera del plan");
  await expect(agentList(page).getByRole("button", { name: /^Ventas/ })).toContainText("Activo");
  await expectAccessible(page);
  await shootThemes(page, "plan-agents-over-limit", () => expect(page.getByText("Algunos agentes quedaron fuera de tu plan")).toBeVisible());
});

test("creating an agent past the plan limit says so and links to billing", async ({ page }) => {
  await openAgentsWith(page, "billing-demo");
  await page.getByRole("button", { name: "Nuevo agente" }).click();
  await editor(page).getByLabel("Nombre").fill("Consultas");
  const created = page.waitForResponse((response) => response.url().endsWith("/agents") && response.request().method() === "POST");
  await editor(page).getByRole("button", { name: "Crear agente" }).click();
  expect((await created).status()).toBe(402);
  await expect(editor(page).getByRole("alert")).toHaveText("Llegaste al límite de tu plan.");
  const banner = notice(page, "Llegaste al límite de tu plan");
  await expect(banner.getByRole("link", { name: "Ver planes" })).toHaveAttribute("href", "/app/billing");
  await screenshot(page, "plan-agents-limit-error-light");
  await banner.getByRole("button", { name: "Cerrar aviso" }).click();
  await expect(banner).toHaveCount(0);
});

test("the playground explains a 402 when the plan ended meanwhile", async ({ page }) => {
  await openAgentsWith(page, "billing-demo");
  await page.getByRole("button", { name: "Nuevo agente" }).click();
  await editor(page).getByLabel("Nombre").fill("Consultas");
  await page.getByRole("button", { name: "Probar" }).click();
  await resetApi("billing-none");
  await playground(page).getByPlaceholder("Mensaje del cliente").fill("¿Tienen stock?");
  const run = page.waitForResponse((response) => response.url().endsWith("/agents/playground"));
  await playground(page).getByRole("button", { name: "Enviar" }).click();
  expect((await run).status()).toBe(402);
  await expect(playground(page).getByText("Necesitás un plan activo para hacer esto.")).toBeVisible();
  await expect(playground(page).getByText("Necesitás un plan para probar agentes")).toBeVisible();
  await expect(notice(page, "No tenés un plan activo")).toBeVisible();
  await screenshot(page, "plan-playground-402-light");
});

test("new legal versions ask for an explicit acceptance", async ({ page }) => {
  test.slow();
  await resetApi("billing-active", undefined, { pendingLegal: true });
  await login(page);
  const dialog = page.getByRole("dialog", { name: "Actualizamos nuestros documentos" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("link", { name: "Términos y condiciones" })).toHaveAttribute("href", "/terminos");
  await expect(dialog.getByRole("link", { name: "Política de privacidad" })).toHaveAttribute("href", "/privacidad");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Aceptar" })).toBeDisabled();
  await expectAccessible(page);
  await shootThemes(page, "plan-legal-dialog", () => expect(dialog).toBeVisible());

  await dialog.getByLabel("Leí y acepto estos documentos.").check();
  const accepted = page.waitForResponse((response) => response.url().endsWith("/legal/acceptances"));
  await dialog.getByRole("button", { name: "Aceptar" }).click();
  expect((await accepted).status()).toBe(204);
  await expect(dialog).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Bandeja" })).toBeVisible();
  await expect(dialog).toHaveCount(0);
});

test("an invitation for another email explains why it cannot be used", async ({ page }) => {
  test.slow();
  await resetApi("billing-invited");
  await login(page);
  const banner = notice(page, "Tenés una invitación a la Beta");
  await expect(banner).toContainText("La invitación es para ana@negocio.com y entraste con demo@boxlead.app.");
  await expectAccessible(page);
  await shootThemes(page, "plan-invited-other-email", () => expect(banner).toBeVisible());
  await banner.getByRole("button", { name: "Activar la Beta" }).click();
  await expect(notices(page).getByRole("alert")).toContainText(
    "Esta invitación es para ana@negocio.com. Salí y entrá con ese email para activar la Beta.",
  );
  await expectNoHorizontalScroll(page);
  await screenshot(page, "plan-invited-mismatch-light");
});

function metricsRequests(page: Page) {
  const responses: Response[] = [];
  page.on("response", (response) => {
    if (/\/metrics\?from=/.test(response.url())) responses.push(response);
  });
  return responses;
}

test("metrics with a short history only offer the periods that fit and no forecast", async ({ page }) => {
  test.slow();
  const responses = metricsRequests(page);
  await resetApi("billing-demo");
  await login(page, "/app/metrics?period=90");
  await expect(page.getByRole("heading", { level: 1, name: "Métricas" })).toBeVisible();
  const periods = page.getByRole("group", { name: "Período" }).getByRole("button");
  await expect(periods).toHaveText(["7 días"]);
  await expect(periods.first()).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Tu plan incluye 30 días de historial.")).toBeVisible();
  await expect(page.getByText(/Próximos 14 días/)).toHaveCount(0);
  await expect.poll(() => new Set(responses.map((response) => response.url())).size).toBe(2);
  expect(responses.map((response) => response.status()).every((status) => status === 200)).toBe(true);
  await expectNoHorizontalScroll(page);
  await expectAccessible(page);
  await shootThemes(page, "plan-metrics-short", () => expect(page.getByText("Tu plan incluye 30 días de historial.")).toBeVisible());
});

test("metrics with three months of history keep the forecast", async ({ page }) => {
  const responses = metricsRequests(page);
  await resetApi("billing-active");
  await login(page, "/app/metrics?period=90");
  const periods = page.getByRole("group", { name: "Período" }).getByRole("button");
  await expect(periods).toHaveText(["7 días", "30 días"]);
  await expect(periods.nth(1)).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => new Set(responses.map((response) => response.url())).size).toBe(3);
  expect(responses.map((response) => response.status()).every((status) => status === 200)).toBe(true);
});
