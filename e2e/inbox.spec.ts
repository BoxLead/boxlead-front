import { expect, test, type Page } from "@playwright/test";
import { expectAccessible, login, resetApi, screenshot } from "./support.ts";

const list = (page: Page) => page.getByRole("list", { name: "Conversaciones" });
const openConversation = async (page: Page, name: string) => {
  await list(page).getByRole("link", { name: new RegExp(name) }).click();
  await expect(page.getByRole("heading", { level: 2, name })).toBeVisible();
};

test.beforeEach(async () => {
  await resetApi();
});

test("lists every channel by recent activity with unread counts", async ({ page }) => {
  await login(page);
  const items = list(page).getByRole("link");
  await expect(items).toHaveCount(5);
  await expect(items.first()).toContainText("Martín Herrera");
  await expect(items.first()).toContainText("2 sin leer");
  await expect(page.getByRole("group", { name: "Canal" }).getByRole("button")).toHaveText([
    "Todos",
    /MercadoLibre/,
    /WhatsApp/,
    /Instagram/,
    "Messenger",
  ]);
  await expect(list(page).getByText("Preguntas")).toBeVisible();
  await expect(list(page).getByText("Postventa")).toBeVisible();
  await expectAccessible(page);
  await screenshot(page, "inbox-list");
});

test("filters by channel and MercadoLibre stage and keeps them in the URL", async ({ page }) => {
  await login(page);
  await page.getByRole("group", { name: "Canal" }).getByRole("button", { name: /MercadoLibre/ }).click();
  await expect(list(page).getByRole("link")).toHaveCount(2);
  await page.getByRole("group", { name: "Etapa" }).getByRole("button", { name: /Postventa/ }).click();
  await expect(list(page).getByRole("link")).toHaveCount(1);
  await expect(list(page)).toContainText("CAROLINA_PZ");
  await expect(page).toHaveURL(/channel=MELI&stage=POST_SALE/);
  await page.reload();
  await expect(list(page).getByRole("link")).toHaveCount(1);
});

test("search matches names and messages without accents", async ({ page }) => {
  await login(page);
  await page.getByRole("searchbox", { name: "Buscar conversaciones" }).fill("martin");
  await expect(list(page).getByRole("link")).toHaveCount(2);
  await page.getByRole("searchbox", { name: "Buscar conversaciones" }).fill("FACTURA");
  await expect(list(page).getByRole("link")).toHaveCount(1);
  await page.getByRole("searchbox", { name: "Buscar conversaciones" }).fill("zzz");
  await expect(page.getByText("No hay conversaciones que coincidan con “zzz”.")).toBeVisible();
});

test("MercadoLibre questions are grouped by listing and answered oldest first", async ({ page }) => {
  await login(page);
  await openConversation(page, "MARTINGOMEZ_82");

  const auriculares = page.getByRole("region", { name: /Auriculares inalámbricos Sony/ });
  await expect(auriculares.locator("img.listing-image")).toHaveAttribute("src", /auriculares\.svg$/);
  await expect(auriculares).toContainText("$ 899.999");
  await expect(auriculares).toContainText("Tu respuesta");
  const next = auriculares.locator(".question-next");
  await expect(next).toContainText("¿Hacen envío a Córdoba capital?");
  await expect(next).toContainText("Se responde ahora");
  await expect(page.getByRole("region", { name: /Parlante portátil JBL/ })).toContainText("Pendiente");
  await expect(page.getByText("0 / 2.000")).toBeVisible();
  await expectAccessible(page);
  await screenshot(page, "inbox-meli-questions");

  const composer = page.getByLabel("Responder a MARTINGOMEZ_82");
  await composer.fill("Sí, enviamos a todo el país por Mercado Envíos.");
  await page.getByRole("button", { name: "Responder" }).click();
  await expect(auriculares.locator(".question-answer").last()).toContainText("Mercado Envíos");
  await expect(page.getByRole("region", { name: /Parlante portátil JBL/ }).locator(".question-next")).toContainText("factura A");

  await composer.fill("Sí, emitimos factura A.");
  await composer.press("Enter");
  await expect(page.getByRole("status").filter({ hasText: "No hay preguntas pendientes" })).toBeVisible();
  await expect(page.getByLabel("Responder a MARTINGOMEZ_82")).toHaveCount(0);
  await expect(page.locator(".conversation-item", { hasText: "MARTINGOMEZ_82" })).not.toContainText("sin leer");
});

test("post-sale messages show the order and respect the 350 character limit", async ({ page }) => {
  await login(page, "/app/inbox?channel=MELI&stage=POST_SALE");
  await openConversation(page, "CAROLINA_PZ");
  const order = page.getByRole("article", { name: "Venta 2000009871234" });
  await expect(order).toContainText("Pagada");
  await expect(order).toContainText("1 ×");
  await expect(order).toContainText("Parlante portátil JBL Flip 6 azul");
  await expect(page.getByText("MercadoLibre limita los mensajes de postventa a 350 caracteres.")).toBeVisible();

  const composer = page.getByLabel("Responder a CAROLINA_PZ");
  await composer.fill("x".repeat(351));
  await expect(page.getByText("351 / 350")).toBeVisible();
  await expect(page.getByRole("button", { name: "Enviar" })).toBeDisabled();

  await composer.fill("¡Gracias por tu compra, Carolina!");
  await page.getByRole("button", { name: "Enviar" }).click();
  await expect(page.locator(".bubble-outbound").last()).toContainText("¡Gracias por tu compra, Carolina!");
  await screenshot(page, "inbox-meli-postsale");
});

test("an expired MercadoLibre authorization is explained with a reconnect action", async ({ page }) => {
  await resetApi("meli-reconnect");
  await login(page, "/app/inbox?channel=MELI&stage=POST_SALE");
  await openConversation(page, "CAROLINA_PZ");
  await expect(page.getByRole("status").filter({ hasText: "Hay que reconectar MercadoLibre" })).toBeVisible();
  await page.getByLabel("Responder a CAROLINA_PZ").fill("Hola");
  await page.getByRole("button", { name: "Enviar" }).click();
  const alert = page.getByRole("alert").filter({ hasText: "Hay que reconectar MercadoLibre" });
  await expect(alert).toBeVisible();
  await expect(alert.getByRole("button", { name: "Reconectar MercadoLibre" })).toBeVisible();
  await expect(page.locator(".bubble-failed")).toContainText("No se envió.");
  await expect(page.getByLabel("Responder a CAROLINA_PZ")).toHaveValue("Hola");
  await screenshot(page, "inbox-meli-reconnect");
});

test("WhatsApp chats send messages and group them by day", async ({ page }, testInfo) => {
  await login(page);
  await openConversation(page, "Martín Herrera");
  await page.getByLabel("Responder a Martín Herrera").fill("Dale, quedo atento.");
  await page.getByRole("button", { name: "Enviar" }).click();
  await expect(page.locator(".bubble-outbound").last()).toContainText("Dale, quedo atento.");
  await expect(page.getByRole("region", { name: "Hoy" }).locator(".bubble-outbound").last()).toContainText(
    "Dale, quedo atento.",
  );
  await screenshot(page, "inbox-whatsapp");
  if (testInfo.project.name === "mobile") await page.getByRole("link", { name: "Volver a la lista" }).click();
  await expect(list(page).getByRole("link", { name: /Martín Herrera/ })).toContainText("Vos: Dale, quedo atento.");
});

test("Instagram comments open as a read-only thread", async ({ page }) => {
  await login(page);
  await page.getByRole("group", { name: "Vista" }).getByRole("button", { name: "Comentarios" }).click();
  await page.getByRole("list", { name: "Comentarios" }).getByRole("link", { name: /nico\.audio/ }).click();
  await expect(page.locator(".conversation-header-meta")).toContainText("Comentó en un reel");
  await expect(page.locator(".comment-replies")).toContainText("¡Te escribimos por privado!");
  await expect(page.getByText("Los comentarios se responden desde Instagram")).toBeVisible();
  await expectAccessible(page);
});

test("an unknown conversation link explains itself", async ({ page }) => {
  await login(page, "/app/inbox?id=00000000-0000-4000-8000-000000000000");
  await expect(page.getByText("No encontramos esta conversación")).toBeVisible();
});

test("on small screens the list and the conversation take turns", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "mobile only");
  await login(page);
  await openConversation(page, "Martín Herrera");
  await expect(page.getByRole("list", { name: "Conversaciones" })).toBeHidden();
  await page.getByRole("link", { name: "Volver a la lista" }).click();
  await expect(page.getByRole("list", { name: "Conversaciones" })).toBeVisible();
});
