import type { Page } from "@playwright/test";
import { expect, expectAccessible, login, mockApiUrl, resetApi, routeOAuthProvider, screenshot, test } from "./support.ts";

const MELI_AUTH = "auth.mercadolibre.test";

test("each channel shows its own card, with MercadoLibre featured", async ({ page }) => {
  await resetApi("empty");
  await login(page, "/app/connections");
  const cards = page.getByRole("list", { name: "Canales" }).locator(":scope > li");
  await expect(cards).toHaveCount(4);
  await expect(cards.first()).toContainText("MercadoLibre");
  await expect(cards.first()).toContainText("Cómo funciona");
  await expect(cards.first()).toContainText("Preguntas de tus publicaciones");
  await expect(page.getByText("0 de 4 canales conectados")).toBeVisible();
  await expectAccessible(page);
  await screenshot(page, "connections-empty");
});

test("connected accounts show their activity", async ({ page }) => {
  await resetApi();
  await login(page, "/app/connections");
  const meli = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "MercadoLibre" }) });
  await expect(meli.getByText("TIENDA_NORTE")).toBeVisible();
  await expect(meli.getByText(/Última actividad hace \d+ min/)).toBeVisible();
  await expect(meli.getByText("Conectado")).toBeVisible();
  await expect(page.getByText("3 de 4 canales conectados")).toBeVisible();
  await expectAccessible(page);
  await screenshot(page, "connections-connected");
});

test("connecting MercadoLibre goes through OAuth with PKCE and comes back highlighted", async ({ page }) => {
  await resetApi("empty");
  await login(page, "/app/connections");
  let stateSent = "";
  page.on("request", (request) => {
    if (request.url().startsWith(`https://${MELI_AUTH}`)) {
      stateSent = new URL(request.url()).searchParams.get("state") ?? "";
    }
  });
  await routeOAuthProvider(page, MELI_AUTH, () => ({ code: "abc", state: stateSent }));

  await page.getByRole("button", { name: "Conectar MercadoLibre" }).click();

  await expect(page).toHaveURL(/\/app\/connections$/);
  await expect(page.getByRole("status").filter({ hasText: "Conectaste MercadoLibre: TIENDA_NORTE." })).toBeVisible();
  await expect(page.locator(".channel-card-highlight")).toContainText("TIENDA_NORTE");
  await expect(page.getByText("1 de 4 canales conectados")).toBeVisible();
});

test("cancelling the authorization explains what happened", async ({ page }) => {
  await resetApi("empty");
  await login(page, "/app/connections");
  let stateSent = "";
  page.on("request", (request) => {
    if (request.url().startsWith(`https://${MELI_AUTH}`)) {
      stateSent = new URL(request.url()).searchParams.get("state") ?? "";
    }
  });
  await routeOAuthProvider(page, MELI_AUTH, () => ({ error: "access_denied", state: stateSent }));
  await page.getByRole("button", { name: "Conectar MercadoLibre" }).click();
  await expect(page.getByRole("heading", { name: "No pudimos conectar MercadoLibre" })).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("Cancelaste la autorización en MercadoLibre");
  await screenshot(page, "oauth-cancelled");
  await page.getByRole("link", { name: "Volver a conexiones" }).click();
  await expect(page).toHaveURL(/\/app\/connections$/);
});

test("a callback that this browser did not start is rejected", async ({ page }) => {
  await resetApi("empty");
  await login(page, "/app/oauth/callback/MELI?code=abc&state=forged");
  await expect(page.getByRole("alert")).toContainText("No pudimos verificar");
  const connections = await page.request.get(`${mockApiUrl()}/oauth/connections`);
  expect(await connections.json()).toEqual([]);
});

test("an expired MercadoLibre authorization asks to reconnect and clears after reconnecting", async ({ page }) => {
  await resetApi("meli-reconnect");
  await login(page, "/app/connections");
  const banner = page.getByRole("status").filter({ hasText: "Reconectá TIENDA_NORTE" });
  await expect(banner).toBeVisible();
  await expect(page.getByText("Requiere reconexión")).toBeVisible();
  await expect(page.getByText("3 notificaciones con error esta semana")).toBeVisible();
  await screenshot(page, "connections-reconnect");

  let stateSent = "";
  page.on("request", (request) => {
    if (request.url().startsWith(`https://${MELI_AUTH}`)) {
      stateSent = new URL(request.url()).searchParams.get("state") ?? "";
    }
  });
  await routeOAuthProvider(page, MELI_AUTH, () => ({ code: "renewed", state: stateSent }));
  await banner.getByRole("button", { name: "Reconectar" }).click();

  await expect(page).toHaveURL(/\/app\/connections$/);
  await expect(page.getByText("Requiere reconexión")).toHaveCount(0);
  await expect(page.getByRole("status").filter({ hasText: "Reconectá" })).toHaveCount(0);
});

test("disconnecting asks for confirmation and keeps the user informed", async ({ page }) => {
  await resetApi();
  await login(page, "/app/connections");
  await page.getByRole("button", { name: "Desconectar @tiendanorte" }).click();
  const dialog = page.getByRole("dialog", { name: "¿Desconectar @tiendanorte?" });
  await expect(dialog).toContainText("se conservan");
  await screenshot(page, "connections-disconnect");
  await dialog.getByRole("button", { name: "Cancelar" }).click();
  await expect(dialog).toBeHidden();

  await page.getByRole("button", { name: "Desconectar @tiendanorte" }).click();
  await dialog.getByRole("button", { name: "Desconectar" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Desconectaste @tiendanorte." })).toBeVisible();
  await expect(page.getByText("@tiendanorte")).toHaveCount(0);
  await expect(page.getByText("2 de 4 canales conectados")).toBeVisible();
});

type SignupSession = { event: string; data: Record<string, unknown> };
type LoginResponse = { authResponse?: { code: string }; status?: string };

async function stubEmbeddedSignup(page: Page, session: SignupSession | null, code: string | null) {
  await page.addInitScript(
    ({ session, code }) => {
      (window as unknown as { FB: unknown }).FB = {
        init: () => undefined,
        login: (callback: (response: LoginResponse) => void) => {
          if (session) {
            const data = JSON.stringify({ type: "WA_EMBEDDED_SIGNUP", ...session });
            window.dispatchEvent(new MessageEvent("message", { origin: "https://www.facebook.com", data }));
          }
          setTimeout(() => callback(code ? { authResponse: { code } } : { status: "unknown" }), 0);
        },
      };
    },
    { session, code },
  );
}

test("connecting a WhatsApp number sends Meta's session data to the callback", async ({ page }) => {
  await resetApi("empty");
  await stubEmbeddedSignup(page, { event: "FINISH", data: { phone_number_id: "pn-1", waba_id: "waba-1", business_id: "b-1" } }, "wa-code");
  await login(page, "/app/connections");

  const callback = page.waitForRequest((request) => request.url().endsWith("/oauth/WHATSAPP/callback"));
  await page.getByRole("button", { name: "Conectar WhatsApp" }).click();

  expect((await callback).postDataJSON()).toEqual({
    code: "wa-code",
    phoneNumberId: "pn-1",
    wabaId: "waba-1",
    phoneNumberRegistered: false,
  });
  await expect(page.getByRole("status").filter({ hasText: "Conectaste WhatsApp" })).toBeVisible();
});

test("a number that already runs on the WhatsApp Business app is reported as registered", async ({ page }) => {
  await resetApi("empty");
  await stubEmbeddedSignup(
    page,
    { event: "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING", data: { phone_number_id: "pn-2", waba_id: "waba-1" } },
    "wa-code",
  );
  await login(page, "/app/connections");

  const callback = page.waitForRequest((request) => request.url().endsWith("/oauth/WHATSAPP/callback"));
  await page.getByRole("button", { name: "Conectar WhatsApp" }).click();

  expect((await callback).postDataJSON()).toMatchObject({ phoneNumberId: "pn-2", phoneNumberRegistered: true });
});

test("a WhatsApp Business app number connects with only its account id", async ({ page }) => {
  await resetApi("empty");
  await stubEmbeddedSignup(page, { event: "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING", data: { waba_id: "waba-1" } }, "wa-code");
  await login(page, "/app/connections");

  const callback = page.waitForRequest((request) => request.url().endsWith("/oauth/WHATSAPP/callback"));
  await page.getByRole("button", { name: "Conectar WhatsApp" }).click();

  expect((await callback).postDataJSON()).toEqual({ code: "wa-code", wabaId: "waba-1", phoneNumberRegistered: true });
  await expect(page.getByRole("status").filter({ hasText: "Conectaste WhatsApp" })).toBeVisible();
});

test("the WhatsApp sign up offers to keep the WhatsApp Business app", async ({ page }) => {
  await resetApi("empty");
  await page.addInitScript(() => {
    (window as unknown as { FB: unknown }).FB = {
      init: () => undefined,
      login: (_callback: unknown, options: unknown) => {
        (window as unknown as { loginOptions: unknown }).loginOptions = options;
      },
    };
  });
  await login(page, "/app/connections");
  const copy = page.getByText("Lo que escribís desde la app de WhatsApp Business");
  await copy.scrollIntoViewIfNeeded();
  await expect(copy).toBeVisible();
  await screenshot(page, "connections-whatsapp-business-app");

  await page.getByRole("button", { name: "Conectar WhatsApp" }).click();

  await expect
    .poll(() => page.evaluate(() => (window as unknown as { loginOptions?: { extras?: unknown } }).loginOptions?.extras))
    .toEqual({ version: "v4", setup: {}, featureType: "whatsapp_business_app_onboarding", sessionInfoVersion: "3" });
});

test("a WhatsApp sign up that finished without a number says so", async ({ page }) => {
  await resetApi("empty");
  await stubEmbeddedSignup(page, { event: "FINISH_ONLY_WABA", data: { waba_id: "waba-1" } }, "wa-code");
  await login(page, "/app/connections");

  await page.getByRole("button", { name: "Conectar WhatsApp" }).click();

  const banner = page.getByRole("alert").filter({ hasText: "El alta terminó sin un número de teléfono" });
  await expect(banner).toBeVisible();
  await banner.scrollIntoViewIfNeeded();
  await expectAccessible(page);
  await screenshot(page, "connections-whatsapp-no-number");
});

test("an error Meta reports during the WhatsApp sign up is shown as Meta wrote it", async ({ page }) => {
  await resetApi("empty");
  await stubEmbeddedSignup(
    page,
    { event: "ERROR", data: { error_message: "Something went wrong", error_code: "524126", session_id: "s-1" } },
    null,
  );
  await login(page, "/app/connections");

  await page.getByRole("button", { name: "Conectar WhatsApp" }).click();

  const banner = page.getByRole("alert").filter({ hasText: "Meta informó un error en el alta de WhatsApp: Something went wrong (524126)" });
  await expect(banner).toBeVisible();
  await banner.scrollIntoViewIfNeeded();
  await screenshot(page, "connections-whatsapp-error");
});

test("closing the WhatsApp sign up before finishing is not an error of ours", async ({ page }) => {
  await resetApi("empty");
  await stubEmbeddedSignup(page, { event: "CANCEL", data: { current_step: "PHONE_NUMBER_SETUP" } }, null);
  await login(page, "/app/connections");

  await page.getByRole("button", { name: "Conectar WhatsApp" }).click();

  await expect(page.getByRole("alert").filter({ hasText: "Cerraste el alta de WhatsApp antes de terminar." })).toBeVisible();
});
