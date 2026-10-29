import type { Page, Request } from "@playwright/test";
import { UNSUBSCRIBE_TOKEN } from "./mock-api/notifications.ts";
import { APP_PORT, MOCK_API_ORIGIN } from "./ports.ts";
import { expect, expectAccessible, login, mockApiUrl, resetApi, screenshot, test } from "./support.ts";

const CSRF_HEADERS = { "Content-Type": "application/json", "X-Requested-With": "boxlead-web" };
const POLL_MS = 20_000;

type MockNotifications = {
  latest: number;
  seen: number[];
  settings: { newLeadEmail: boolean; handoffEmail: boolean; browser: boolean };
  unsubscribes: { token: string; scope: string }[];
};

async function notify(kind: "NEW_LEAD" | "HANDOFF", platform = "WHATSAPP") {
  const res = await fetch(`${mockApiUrl()}/__notify`, { method: "POST", headers: CSRF_HEADERS, body: JSON.stringify({ kind, platform }) });
  expect(res.ok).toBe(true);
}

async function mockState(): Promise<MockNotifications> {
  return (await (await fetch(`${mockApiUrl()}/__notifications`)).json()) as MockNotifications;
}

function apiPath(request: Request): URL | null {
  const url = new URL(request.url());
  return url.port === String(APP_PORT) ? null : url;
}

function isNotificationsCall(request: Request): boolean {
  return apiPath(request)?.pathname.startsWith("/notifications") === true;
}

function isCursorCall(request: Request): boolean {
  const url = apiPath(request);
  return url?.pathname === "/notifications" && url.search === "";
}

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

function toast(page: Page, text: string) {
  return page.locator(".toast-region .toast").filter({ hasText: text });
}

test("with the flag on a new notice shows a toast, counts in the title and is marked seen", async ({ page }) => {
  test.slow();
  await resetApi("default", undefined, { notifications: true, notices: 4 });
  await page.clock.install();
  const cursor = page.waitForResponse((response) => isCursorCall(response.request()));
  await login(page, "/app/leads");
  await expect(page.getByRole("heading", { level: 1, name: "Leads" })).toBeVisible();
  await cursor;

  await page.clock.runFor(POLL_MS);
  await expect(page.locator(".toast-region .toast")).toHaveCount(0);
  expect((await mockState()).seen).toEqual([]);

  await notify("NEW_LEAD", "WHATSAPP");
  await notify("NEW_LEAD", "INSTAGRAM");
  await notify("HANDOFF", "INSTAGRAM");
  await page.clock.runFor(POLL_MS);

  await expect(toast(page, "Entraron 2 leads nuevos")).toBeVisible();
  await expect(toast(page, "Una conversación necesita tu respuesta")).toBeVisible();
  await expect(page).toHaveTitle("(3) Leads · BoxLead");
  await expect.poll(async () => (await mockState()).seen).toEqual([7]);
  await expectNoHorizontalScroll(page);
  await screenshot(page, "notifications-toasts");

  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page).toHaveTitle("Leads · BoxLead");

  await notify("NEW_LEAD", "MELI");
  await page.clock.runFor(POLL_MS);
  await expect(toast(page, "Entró un lead nuevo por MercadoLibre")).toBeVisible();
  await expect(page).toHaveTitle("(1) Leads · BoxLead");
  await page.getByRole("link", { name: "Bandeja" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Bandeja" })).toBeVisible();
  await expect(page).toHaveTitle("Bandeja · BoxLead");
  await expect.poll(async () => (await mockState()).seen).toEqual([7, 8]);
});

test("with the flag off nothing asks for notices and the menu has no link", async ({ page }) => {
  await resetApi();
  const calls: string[] = [];
  page.on("request", (request) => {
    if (isNotificationsCall(request)) calls.push(request.url());
  });
  await page.clock.install();
  await login(page, "/app/leads");
  await expect(page.getByRole("heading", { level: 1, name: "Leads" })).toBeVisible();
  await notify("NEW_LEAD");
  await page.clock.runFor(POLL_MS * 2);
  await expect(page.locator(".toast-region .toast")).toHaveCount(0);
  await expect(page).toHaveTitle("Leads · BoxLead");

  await page.getByRole("button", { name: "Cuenta" }).click();
  await expect(page.getByRole("dialog", { name: "Cuenta" }).getByRole("link", { name: "Notificaciones" })).toHaveCount(0);
  await page.goto("/app/notificaciones");
  await expect(page).toHaveURL(/\/app\/inbox$/);
  expect(calls).toEqual([]);
});

test("the preferences toggle and persist, and the browser switch stops the notices", async ({ page }) => {
  test.slow();
  await resetApi("default", undefined, { notifications: true });
  await page.clock.install();
  await login(page, "/app/inbox");
  await page.getByRole("button", { name: "Cuenta" }).click();
  const account = page.getByRole("dialog", { name: "Cuenta" });
  await expect(account.getByRole("link", { name: "Notificaciones" })).toBeVisible();
  await screenshot(page, "notifications-account-menu");
  await account.getByRole("link", { name: "Notificaciones" }).click();

  await expect(page).toHaveURL(/\/app\/notificaciones$/);
  await expect(page.getByRole("heading", { level: 1, name: "Notificaciones" })).toBeVisible();
  await expect(page).toHaveTitle("Notificaciones · BoxLead");
  const lead = page.getByRole("switch", { name: "Mail cuando entra un lead nuevo" });
  const handoff = page.getByRole("switch", { name: "Mail cuando el agente pasa una conversación a una persona" });
  const browser = page.getByRole("switch", { name: "Avisos en el navegador con la app abierta" });
  await expect(lead).toBeChecked();
  await expect(handoff).toBeChecked();
  await expect(browser).toBeChecked();
  await expect(page.getByText("Notificaciones del sistema")).toBeVisible();
  await expectNoHorizontalScroll(page);
  await expectAccessible(page);
  await screenshot(page, "notifications-settings");

  const saved = page.waitForResponse((response) => response.request().method() === "PUT" && isNotificationsCall(response.request()));
  await lead.click();
  await expect(lead).not.toBeChecked();
  expect((await saved).status()).toBe(200);
  await expect(lead).toBeEnabled();
  await browser.click();
  await expect(browser).not.toBeChecked();
  await expect.poll(async () => (await mockState()).settings).toEqual({ newLeadEmail: false, handoffEmail: true, browser: false });

  await page.reload();
  await expect(page.getByRole("switch", { name: "Mail cuando entra un lead nuevo" })).not.toBeChecked();
  await expect(page.getByRole("switch", { name: "Avisos en el navegador con la app abierta" })).not.toBeChecked();
  await expect(page.getByRole("switch", { name: "Mail cuando el agente pasa una conversación a una persona" })).toBeChecked();
  await notify("HANDOFF");
  await page.clock.runFor(POLL_MS);
  await expect(page.locator(".toast-region .toast")).toHaveCount(0);
  expect((await mockState()).seen).toEqual([]);
});

test("a failed save goes back and says so", async ({ page }) => {
  await resetApi("default", undefined, { notifications: true });
  await login(page, "/app/notificaciones");
  const handoff = page.getByRole("switch", { name: "Mail cuando el agente pasa una conversación a una persona" });
  await expect(handoff).toBeChecked();
  await page.route(`${MOCK_API_ORIGIN}/notifications/settings`, (route) =>
    route.request().method() === "PUT"
      ? route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ message: "Boom" }) })
      : route.fallback(),
  );
  await handoff.click();
  await expect(toast(page, "No pudimos guardar el cambio. Probá de nuevo.")).toBeVisible();
  await expect(handoff).toBeChecked();
  await screenshot(page, "notifications-settings-error");
});

test("the unsubscribe page works without a session", async ({ page }) => {
  await resetApi("default", undefined, { notifications: true });
  const calls: string[] = [];
  page.on("request", (request) => {
    if (request.url().startsWith(MOCK_API_ORIGIN)) calls.push(`${request.method()} ${new URL(request.url()).pathname}`);
  });
  await page.goto(`/avisos/baja?token=${UNSUBSCRIBE_TOKEN}&scope=NEW_LEAD`);
  await expect(page.getByRole("heading", { level: 1, name: "Dejar de recibir avisos" })).toBeVisible();
  await expect(page.getByText("Vas a dejar de recibir los mails de leads nuevos.")).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
  await expect(page).toHaveTitle("Dejar de recibir avisos · BoxLead");
  await expectNoHorizontalScroll(page);
  await expectAccessible(page);
  await screenshot(page, "notifications-unsubscribe");
  expect(calls).toEqual([]);

  await page.getByRole("button", { name: "Dejar de recibirlos" }).click();
  await expect(
    page.getByText("Listo, no te vamos a mandar más estos mails. Podés volver a activarlos desde Notificaciones en la app."),
  ).toBeVisible();
  expect(calls).toEqual(["POST /notifications/unsubscribe"]);
  const state = await mockState();
  expect(state.unsubscribes).toEqual([{ token: UNSUBSCRIBE_TOKEN, scope: "NEW_LEAD" }]);
  expect(state.settings).toEqual({ newLeadEmail: false, handoffEmail: true, browser: true });
  await expectAccessible(page);
  await screenshot(page, "notifications-unsubscribe-done");
});

test("the unsubscribe page explains a link without its token", async ({ page }) => {
  await resetApi();
  await page.goto("/avisos/baja?scope=HANDOFF");
  await expect(page.getByRole("heading", { level: 1, name: "Dejar de recibir avisos" })).toBeVisible();
  await expect(page.getByText("A este enlace le falta una parte")).toBeVisible();
  await expect(page.getByRole("button", { name: "Dejar de recibirlos" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Ir a Notificaciones" })).toHaveAttribute("href", "/app/notificaciones");
  await expectNoHorizontalScroll(page);
  await expectAccessible(page);
  await screenshot(page, "notifications-unsubscribe-missing");
});

test("the system notifications are asked only from their button", async ({ page }) => {
  await page.addInitScript(() => {
    const requests: string[] = [];
    class FakeNotification {
      static permission: NotificationPermission = "default";
      static async requestPermission(): Promise<NotificationPermission> {
        requests.push("asked");
        FakeNotification.permission = "granted";
        return FakeNotification.permission;
      }
    }
    Object.defineProperty(window, "Notification", { value: FakeNotification, configurable: true });
    Object.defineProperty(window, "notificationRequests", { value: requests });
  });
  await resetApi("default", undefined, { notifications: true });
  await login(page, "/app/notificaciones");
  const activate = page.getByRole("button", { name: "Activar notificaciones del sistema" });
  await expect(activate).toBeVisible();
  await expect(page.getByText("Sin activar")).toBeVisible();
  expect(await page.evaluate(() => Reflect.get(window, "notificationRequests"))).toEqual([]);
  await expectNoHorizontalScroll(page);
  await screenshot(page, "notifications-settings-system");

  await activate.click();
  await expect(page.getByText("Activadas", { exact: true })).toBeVisible();
  await expect(activate).toHaveCount(0);
  expect(await page.evaluate(() => Reflect.get(window, "notificationRequests"))).toEqual(["asked"]);
});

test("the account screen shows the preferences only with the flag on", async ({ page }) => {
  await resetApi("default", undefined, { notifications: true });
  await login(page, "/app/cuenta");
  await expect(page.getByRole("heading", { level: 1, name: "Tu cuenta" })).toBeVisible();
  await expect(page.getByRole("switch", { name: "Mail cuando entra un lead nuevo" })).toBeVisible();
  await expectAccessible(page);
  await screenshot(page, "notifications-account");

  await resetApi();
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Tu cuenta" })).toBeVisible();
  await expect(page.getByRole("switch", { name: "Mail cuando entra un lead nuevo" })).toHaveCount(0);
});
