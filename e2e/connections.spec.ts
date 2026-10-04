import { expect, test } from "@playwright/test";
import { expectAccessible, login, resetApi, routeOAuthProvider, screenshot } from "./support.ts";

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
  const connections = await page.request.get("http://localhost:8090/oauth/connections");
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
