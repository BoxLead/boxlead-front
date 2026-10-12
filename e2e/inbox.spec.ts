import { expect, test, type Page } from "@playwright/test";
import { expectAccessible, login, resetApi, screenshot } from "./support.ts";

const list = (page: Page) => page.getByRole("list", { name: "Conversaciones" });
const openConversation = async (page: Page, name: string) => {
  const back = page.getByRole("link", { name: "Volver a la lista" });
  if (await back.isVisible()) await back.click();
  await list(page).getByRole("link", { name: new RegExp(name) }).click();
  await expect(page.getByRole("heading", { level: 2, name })).toBeVisible();
};

test.beforeEach(async () => {
  await resetApi();
});

test("lists every channel by recent activity with unread counts", async ({ page }) => {
  await login(page);
  const items = list(page).getByRole("link");
  await expect(items).toHaveCount(6);
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

test("Instagram comments are events of the chat, link to the post and are answered in public", async ({ page }) => {
  await login(page);
  await openConversation(page, "nico.audio");

  const events = page.locator(".comment-event");
  await expect(events).toHaveCount(3);
  await expect(events.first()).toContainText("Comentó en un reel");
  await expect(events.first().getByRole("link", { name: /Flip 6 en stock/ })).toHaveAttribute(
    "href",
    "https://www.instagram.com/reel/C9mockReel1/",
  );
  await expect(events.nth(1)).toContainText("Respondiste en público");
  await expect(events.nth(1)).toContainText("¡Te escribimos por privado!");
  await expect(events.first()).toContainText("Respondido en público");
  await expect(events.first().getByRole("button", { name: "Responder en público" })).toHaveCount(0);
  await expectAccessible(page);
  await screenshot(page, "inbox-instagram-comments");

  const pendingComment = events.nth(2);
  await expect(pendingComment).toContainText("¿Y lo tienen en azul?");
  await pendingComment.getByRole("button", { name: "Responder en público" }).click();
  await page.getByLabel("Responder en público a nico.audio").fill("¡Sí! Lo tenemos en azul y en negro.");
  await page.locator(".comment-event-reply").getByRole("button", { name: "Enviar" }).click();

  await expect(events).toHaveCount(4);
  await expect(events.last()).toContainText("Respondiste en público");
  await expect(events.last()).toContainText("Lo tenemos en azul y en negro");
  await expect(pendingComment).toContainText("Respondido en público");
  await expect(pendingComment.getByRole("button", { name: "Responder en público" })).toHaveCount(0);
});

test("an Instagram message refused for the window is a private reply to the last comment, once", async ({ page }) => {
  await login(page);
  await openConversation(page, "nico.audio");
  const composer = page.getByLabel("Responder a nico.audio");
  const send = page.locator(".conversation-footer").getByRole("button", { name: "Enviar" });
  await expect(page.getByText(/respuesta privada a su último comentario/)).toBeVisible();

  await composer.fill("Te paso el precio por acá.");
  await send.click();
  await expect(page.locator(".bubble-outbound").last()).toContainText("Te paso el precio por acá.");

  await composer.fill("¿Te sirve?");
  await send.click();
  const alert = page.getByRole("alert").filter({ hasText: "Ya no podés escribirle por privado" });
  await expect(alert).toBeVisible();
  await expect(page.locator(".bubble-failed")).toContainText("No se envió.");
  await screenshot(page, "inbox-instagram-private-reply-closed");
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

test.describe("agents in the inbox", () => {
  test.beforeEach(async () => {
    await resetApi("agents");
  });

  test("a draft from an agent can be sent as it is", async ({ page }) => {
    await login(page);
    await openConversation(page, "Martín Herrera");
    const draft = page.getByRole("region", { name: "Borrador de Ventas" });
    await expect(draft).toContainText("Pasame el CUIT y te mandamos la factura A hoy mismo.");
    await expectAccessible(page);
    await screenshot(page, "inbox-draft");

    await draft.getByRole("button", { name: "Enviar borrador" }).click();
    await expect(page.locator(".bubble-list").getByText("Pasame el CUIT y te mandamos la factura A hoy mismo.")).toBeVisible();
    await expect(draft).toBeHidden();
    await page.reload();
    await expect(page.getByRole("region", { name: "Borrador de Ventas" })).toHaveCount(0);
  });

  test("a draft can be edited before sending", async ({ page }) => {
    await login(page);
    await openConversation(page, "Martín Herrera");
    await page.getByRole("button", { name: "Editar borrador" }).click();
    await expect(page.getByRole("region", { name: "Borrador de Ventas" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Descartar borrador" })).toBeVisible();

    const composer = page.getByLabel("Responder a Martín Herrera");
    await expect(composer).toHaveValue("¡Perfecto Martín! Pasame el CUIT y te mandamos la factura A hoy mismo.");
    await composer.fill("¡Perfecto Martín! Te mandamos la factura A mañana.");
    await composer.press("Enter");
    await expect(page.getByText("Te mandamos la factura A mañana.")).toBeVisible();
    await page.reload();
    await expect(page.getByRole("region", { name: "Borrador de Ventas" })).toHaveCount(0);
  });

  test("a draft being edited can still be discarded", async ({ page }) => {
    await login(page);
    await openConversation(page, "Martín Herrera");
    await page.getByRole("button", { name: "Editar borrador" }).click();
    const composer = page.getByLabel("Responder a Martín Herrera");
    await expect(composer).not.toHaveValue("");
    await page.getByRole("button", { name: "Descartar borrador" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Descartaste el borrador." })).toBeVisible();
    await expect(composer).toHaveValue("");
    await expect(page.getByRole("region", { name: "Borrador de Ventas" })).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("region", { name: "Borrador de Ventas" })).toHaveCount(0);
  });

  test("a draft can be discarded", async ({ page }) => {
    await login(page);
    await openConversation(page, "Martín Herrera");
    await page.getByRole("button", { name: "Descartar borrador" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Descartaste el borrador." })).toBeVisible();
    await expect(page.getByRole("region", { name: "Borrador de Ventas" })).toHaveCount(0);
    await expect(page.getByLabel("Responder a Martín Herrera")).toHaveValue("");
    await page.reload();
    await expect(page.getByRole("region", { name: "Borrador de Ventas" })).toHaveCount(0);
  });

  test("replies written by an agent say who answered", async ({ page }) => {
    await login(page);
    await openConversation(page, "Martín Herrera");
    await expect(page.getByText("Respondido por Ventas")).toHaveCount(1);
    await openConversation(page, "sofi.decoraciones");
    await expect(page.getByText("Respondido por")).toHaveCount(0);
  });

  test("a handoff shows its reason until a person answers", async ({ page }) => {
    await login(page);
    await openConversation(page, "sofi.decoraciones");
    const banner = page.getByRole("status").filter({ hasText: "Un agente pidió tu atención" });
    await expect(banner).toContainText("El cliente pidió hablar con una persona.");
    await expectAccessible(page);
    await screenshot(page, "inbox-handoff");

    await page.getByLabel("Responder a sofi.decoraciones").fill("Hola Sofi, te escribo yo.");
    await page.getByRole("button", { name: "Enviar" }).click();
    await expect(page.getByText("Hola Sofi, te escribo yo.")).toBeVisible();
    await expect(banner).toBeHidden();
    await openConversation(page, "Martín Herrera");
    await expect(page.getByRole("status").filter({ hasText: "Un agente pidió tu atención" })).toHaveCount(0);
  });
});
