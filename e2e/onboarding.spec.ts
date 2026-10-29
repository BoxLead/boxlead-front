import type { Page } from "@playwright/test";
import { expect, expectAccessible, login, mockApiUrl, resetApi, routeOAuthProvider, screenshot, test } from "./support.ts";

const MELI_AUTH = "auth.mercadolibre.test";
const CSRF = { "Content-Type": "application/json", "X-Requested-With": "boxlead-web" };

const checklist = (page: Page) => page.getByRole("region", { name: "Primeros pasos" });

async function runPlaygroundOnce(page: Page, agentId: string) {
  const res = await page.context().request.post(`${mockApiUrl()}/agents/playground`, {
    headers: CSRF,
    data: { messages: [{ id: "m-1", role: "user", content: "Hola" }], state: { agentId, platform: "WHATSAPP" } },
  });
  expect(res.ok()).toBe(true);
}

async function connectMeli(page: Page) {
  let stateSent = "";
  page.on("request", (request) => {
    if (request.url().startsWith(`https://${MELI_AUTH}`)) {
      stateSent = new URL(request.url()).searchParams.get("state") ?? "";
    }
  });
  await routeOAuthProvider(page, MELI_AUTH, () => ({ code: "abc", state: stateSent }));
  await page.getByRole("button", { name: "Conectar MercadoLibre" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Conectaste MercadoLibre: TIENDA_NORTE." })).toBeVisible();
}

test("a new account follows the first steps until the list goes away", async ({ page }) => {
  await resetApi("empty", undefined, { onboarding: true });
  await login(page, "/app/inbox");

  const panel = checklist(page);
  await expect(panel).toBeVisible();
  await expect(panel.getByText("0 de 3")).toBeVisible();
  await expect(panel.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  await expectAccessible(page);
  await screenshot(page, "onboarding-new");

  await panel.getByRole("link", { name: "Conectar" }).click();
  await expect(page).toHaveURL(/\/app\/connections$/);
  await connectMeli(page);
  await expect(panel.getByText("1 de 3")).toBeVisible();
  await expect(panel.getByRole("link", { name: "Conectar" })).toHaveCount(0);

  await panel.getByRole("link", { name: "Crear" }).click();
  await expect(page).toHaveURL(/\/app\/agents\?id=new$/);
  const editor = page.getByRole("form", { name: "Configuración del agente" });
  await editor.getByLabel("Nombre").fill("Consultas");
  await editor.getByRole("button", { name: "Crear agente" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Creaste Consultas." })).toBeVisible();
  await expect(panel.getByText("2 de 3")).toBeVisible();
  await expectAccessible(page);
  await screenshot(page, "onboarding-last-step");

  const agents = (await (await page.context().request.get(`${mockApiUrl()}/agents`)).json()) as { id: string }[];
  const probar = panel.getByRole("link", { name: "Probar" });
  await expect(probar).toHaveAttribute("href", `/app/agents?id=${agents[0].id}&tab=test`);
  await probar.click();
  const playground = page.locator(".playground");
  await expect(playground.getByText("Escribí el primer mensaje del cliente para empezar.")).toBeVisible();
  await playground.getByLabel("Mensaje del cliente").fill("¿Tienen stock?");
  await playground.getByRole("button", { name: "Enviar" }).click();
  await expect(page.getByRole("list", { name: "Conversación de prueba" }).getByRole("listitem")).toHaveCount(2);
  await expect(panel).toHaveCount(0);
});

test("the list catches up with steps done elsewhere when the tab comes back", async ({ page }) => {
  await resetApi("default", undefined, { onboarding: true });
  await page.clock.install();
  await login(page, "/app/leads");
  const panel = checklist(page);
  await expect(panel.getByText("1 de 3")).toBeVisible();

  const created = await page.context().request.post(`${mockApiUrl()}/agents`, {
    headers: CSRF,
    data: {
      name: "Ventas",
      instructions: "",
      enabled: true,
      publicCommentReplies: false,
      scopes: [{ platform: null, categoryId: null, salesStage: null, replyMode: "AUTO" }],
    },
  });
  expect(created.ok()).toBe(true);
  await page.clock.fastForward(15_000);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(panel.getByText("2 de 3")).toBeVisible();
});

test("an account with every step done never sees the list", async ({ page }) => {
  await resetApi("agents", undefined, { onboarding: true });
  const session = await page.context().request.post(`${mockApiUrl()}/auth/login`, {
    headers: CSRF,
    data: { email: "demo@boxlead.app", password: "demo1234" },
  });
  expect(session.ok()).toBe(true);
  const agents = (await (await page.context().request.get(`${mockApiUrl()}/agents`)).json()) as { id: string }[];
  await runPlaygroundOnce(page, agents[0].id);

  let asked = false;
  page.on("response", (response) => {
    if (response.url().endsWith("/onboarding")) asked = true;
  });
  await page.addInitScript(() => {
    new MutationObserver(() => {
      if (document.querySelector(".onboarding")) document.documentElement.dataset.onboardingSeen = "yes";
    }).observe(document, { childList: true, subtree: true });
  });
  await page.goto("/app/inbox");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect.poll(() => asked).toBe(true);
  await expect(checklist(page)).toHaveCount(0);
  await expect(page.locator("html")).not.toHaveAttribute("data-onboarding-seen", "yes");
});

test("with the flag off nothing shows and nothing is asked", async ({ page }) => {
  await resetApi("empty");
  const asked: string[] = [];
  page.on("request", (request) => {
    if (request.url().endsWith("/onboarding")) asked.push(request.url());
  });
  await login(page, "/app/inbox");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.getByRole("link", { name: "Leads", exact: true }).first().click();
  await expect(page).toHaveURL(/\/app\/leads/);
  await expect(checklist(page)).toHaveCount(0);
  expect(asked).toEqual([]);
});
