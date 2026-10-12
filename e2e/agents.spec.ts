import { expect, test, type Page } from "@playwright/test";
import { expectAccessible, login, resetApi, screenshot } from "./support.ts";

const cards = (page: Page) => page.getByRole("list", { name: "Agentes" }).locator(":scope > li");
const card = (page: Page, name: string) =>
  cards(page).filter({ has: page.getByRole("heading", { name, exact: true }) });
const rule = (page: Page, index: number) =>
  page.getByRole("dialog").getByRole("group", { name: `Regla ${index}` });

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

test.beforeEach(async () => {
  await resetApi("agents");
});

test("lists the agents with where each one works and how it replies", async ({ page }) => {
  await login(page, "/app/agents");
  await expect(page.getByRole("heading", { level: 1, name: "Agentes" })).toBeVisible();
  await expect(cards(page)).toHaveCount(2);
  await expect(cards(page).locator("h2")).toHaveText(["Ventas", "Postventa"]);

  const ventas = card(page, "Ventas");
  await expect(ventas.getByRole("list", { name: "Reglas de Ventas" }).getByRole("listitem")).toHaveText([
    "Todos los canales · Automático",
    "Todos los canales · Presupuesto · Borrador",
  ]);
  await expect(ventas.getByRole("switch", { name: "Activar Ventas" })).toBeChecked();

  const postventa = card(page, "Postventa");
  await expect(postventa).toContainText("Pausado");
  await expect(postventa).toContainText("Sin instrucciones");
  await expect(postventa.getByRole("switch", { name: "Activar Postventa" })).not.toBeChecked();
  await expect(postventa.getByRole("listitem")).toHaveText(["MercadoLibre · Postventa · Automático"]);

  await expectNoHorizontalScroll(page);
  await expectAccessible(page);
  await screenshot(page, "agents");
});

test("asks to create the first agent when there are none", async ({ page }) => {
  await resetApi("default");
  await login(page, "/app/agents");
  await expect(page.getByText("Todavía no configuraste agentes")).toBeVisible();
  await expect(cards(page)).toHaveCount(0);
  await expectAccessible(page);

  await page.getByRole("button", { name: "Nuevo agente" }).click();
  const dialog = page.getByRole("dialog", { name: "Nuevo agente" });
  await expect(dialog.getByRole("button", { name: "Crear agente" })).toBeDisabled();
  await dialog.getByLabel("Nombre").fill("Consultas");
  await dialog.getByRole("button", { name: "Crear agente" }).click();

  await expect(page.getByRole("status").filter({ hasText: "Creaste Consultas." })).toBeVisible();
  await expect(card(page, "Consultas")).toContainText("Todos los canales · Automático");
});

test("creates an agent with several rules", async ({ page }) => {
  await login(page, "/app/agents");
  await page.getByRole("button", { name: "Nuevo agente" }).click();
  const dialog = page.getByRole("dialog", { name: "Nuevo agente" });
  await dialog.getByLabel("Nombre").fill("Mercado");
  await dialog.getByLabel("Instrucciones").fill("Respondé siempre con el nombre del producto.");

  await rule(page, 1).getByLabel("Canal").selectOption({ label: "MercadoLibre" });
  await rule(page, 1).getByLabel("Etapa").selectOption({ label: "Preguntas" });
  await rule(page, 1).getByLabel("Modo").selectOption({ label: "Borrador" });

  await dialog.getByRole("button", { name: "Agregar regla" }).click();
  await rule(page, 2).getByLabel("Categoría").selectOption({ label: "Reclamo" });

  await expectNoHorizontalScroll(page);
  await expectAccessible(page);
  await screenshot(page, "agent-dialog");
  await dialog.getByRole("button", { name: "Crear agente" }).click();

  await expect(page.getByRole("status").filter({ hasText: "Creaste Mercado." })).toBeVisible();
  await expect(card(page, "Mercado").getByRole("listitem")).toHaveText([
    "MercadoLibre · Preguntas · Borrador",
    "Todos los canales · Reclamo · Automático",
  ]);
  await expect(cards(page)).toHaveCount(3);
});

test("stage choices follow the channel and repeated rules block saving", async ({ page }) => {
  await login(page, "/app/agents");
  await page.getByRole("button", { name: "Nuevo agente" }).click();
  const dialog = page.getByRole("dialog", { name: "Nuevo agente" });
  await dialog.getByLabel("Nombre").fill("Reglas");

  await expect(rule(page, 1).getByLabel("Etapa").locator("option")).toHaveText(["Todas las etapas", "Preventa", "Postventa"]);
  await rule(page, 1).getByLabel("Canal").selectOption({ label: "WhatsApp" });
  await expect(rule(page, 1).getByLabel("Etapa").locator("option")).toHaveText(["Todas las etapas", "Chats"]);

  await dialog.getByRole("button", { name: "Agregar regla" }).click();
  await rule(page, 2).getByLabel("Canal").selectOption({ label: "WhatsApp" });
  await expect(dialog.getByRole("alert")).toContainText("Hay reglas repetidas");
  await expect(dialog.getByRole("button", { name: "Crear agente" })).toBeDisabled();

  await dialog.getByRole("button", { name: "Quitar regla 2" }).click();
  await expect(dialog.getByRole("button", { name: "Crear agente" })).toBeEnabled();
  await expect(dialog.getByRole("button", { name: "Quitar regla 1" })).toBeDisabled();
});

test("a rule whose category was deleted is shown and must be removed", async ({ page }) => {
  await login(page, "/app/categories");
  await page.getByRole("button", { name: "Eliminar Presupuesto" }).click();
  await page.getByRole("dialog", { name: "¿Eliminar Presupuesto?" }).getByRole("button", { name: "Eliminar" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Eliminaste Presupuesto." })).toBeVisible();

  await page.getByRole("link", { name: "Agentes" }).click();
  await expect(card(page, "Ventas").getByRole("listitem").last()).toHaveText("Todos los canales · Categoría eliminada · Borrador");

  await page.getByRole("button", { name: "Editar Ventas" }).click();
  const dialog = page.getByRole("dialog", { name: "Editar agente" });
  await expect(rule(page, 2)).toContainText("Esta categoría ya no existe");
  await expect(dialog.getByRole("button", { name: "Guardar cambios" })).toBeDisabled();
  await dialog.getByRole("button", { name: "Quitar regla 2" }).click();
  await dialog.getByRole("button", { name: "Guardar cambios" }).click();

  await expect(page.getByRole("status").filter({ hasText: "Guardaste Ventas." })).toBeVisible();
  await expect(card(page, "Ventas").getByRole("listitem")).toHaveText(["Todos los canales · Automático"]);
});

test("edits an agent and keeps its enabled state", async ({ page }) => {
  await login(page, "/app/agents");
  await page.getByRole("button", { name: "Editar Postventa" }).click();
  const dialog = page.getByRole("dialog", { name: "Editar agente" });
  await expect(dialog.getByLabel("Nombre")).toHaveValue("Postventa");
  await dialog.getByLabel("Instrucciones").fill("Ayudá con envíos y facturas.");
  await dialog.getByRole("button", { name: "Guardar cambios" }).click();

  await expect(page.getByRole("status").filter({ hasText: "Guardaste Postventa." })).toBeVisible();
  await expect(card(page, "Postventa")).toContainText("Ayudá con envíos y facturas.");
  await expect(card(page, "Postventa")).toContainText("Pausado");
});

test("pauses and resumes an agent from its card", async ({ page }) => {
  await login(page, "/app/agents");
  const toggle = card(page, "Postventa").getByRole("switch", { name: "Activar Postventa" });
  await toggle.check();
  await expect(page.getByRole("status").filter({ hasText: "Postventa está activo." })).toBeVisible();
  await expect(card(page, "Postventa")).not.toContainText("Pausado");

  await card(page, "Ventas").getByRole("switch", { name: "Activar Ventas" }).uncheck();
  await expect(page.getByRole("status").filter({ hasText: "Ventas quedó en pausa." })).toBeVisible();
  await page.reload();
  await expect(card(page, "Ventas")).toContainText("Pausado");
  await expect(card(page, "Postventa")).not.toContainText("Pausado");
});

test("deletes an agent after confirming", async ({ page }) => {
  await login(page, "/app/agents");
  await page.getByRole("button", { name: "Eliminar Postventa" }).click();
  const dialog = page.getByRole("dialog", { name: "¿Eliminar Postventa?" });
  await dialog.getByRole("button", { name: "Cancelar" }).click();
  await expect(cards(page)).toHaveCount(2);

  await page.getByRole("button", { name: "Eliminar Postventa" }).click();
  await dialog.getByRole("button", { name: "Eliminar" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Eliminaste Postventa." })).toBeVisible();
  await expect(cards(page)).toHaveCount(1);
});

test("saves the business context", async ({ page }) => {
  await login(page, "/app/agents");
  const panel = page.getByRole("region", { name: "Contexto del negocio" });
  const description = panel.getByLabel("Qué hace tu negocio");
  await expect(description).toHaveValue(/Vendemos audio y accesorios/);
  await expect(panel.getByLabel("Tono")).toHaveValue("cercano y directo");
  await expect(panel.getByRole("button", { name: "Guardar contexto" })).toBeDisabled();

  await description.fill("Vendemos parlantes. Horario de lunes a viernes de 9 a 18.");
  await panel.getByRole("switch", { name: "Categorizar leads automáticamente" }).uncheck();
  await panel.getByRole("button", { name: "Guardar contexto" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Guardaste el contexto del negocio." })).toBeVisible();
  await expect(panel.getByRole("button", { name: "Guardar contexto" })).toBeDisabled();

  await page.reload();
  await expect(description).toHaveValue("Vendemos parlantes. Horario de lunes a viernes de 9 a 18.");
  await expect(panel.getByRole("switch", { name: "Categorizar leads automáticamente" })).not.toBeChecked();
});

test("tests a saved agent as a customer and shows the mode that would apply", async ({ page }) => {
  await login(page, "/app/agents");
  await page.getByRole("button", { name: "Probar Ventas" }).click();
  const dialog = page.getByRole("dialog", { name: "Probar Ventas" });
  await expect(dialog.getByText("Escribí el primer mensaje del cliente para empezar.")).toBeVisible();

  await dialog.getByLabel("Canal").selectOption({ label: "WhatsApp" });
  await dialog.getByLabel("Mensaje del cliente").fill("¿Tienen stock del Flip 6?");
  await dialog.getByRole("button", { name: "Enviar" }).click();

  const chat = dialog.getByRole("list", { name: "Conversación de prueba" });
  await expect(chat.getByRole("listitem")).toHaveCount(2);
  await expect(chat).toContainText("¿Tienen stock del Flip 6?");
  await expect(chat).toContainText("¡Hola! Soy Ventas. Gracias por escribir, enseguida te ayudo.");
  const result = dialog.getByRole("region", { name: "Resultado de la prueba" });
  await expect(result).toContainText("El agente respondería");
  await expect(result).toContainText("En producción respondería en modo automático.");

  await result.getByText("Reglas del canal que aplicó").click();
  await expect(result).toContainText("Largo máximo");
  await expect(result).toContainText("2.000 caracteres");
  await expectNoHorizontalScroll(page);
  await expectAccessible(page);
  await screenshot(page, "agent-playground");

  await dialog.getByLabel("Categoría del lead").selectOption({ label: "Presupuesto" });
  await expect(dialog.getByText("Escribí el primer mensaje del cliente para empezar.")).toBeVisible();
  await dialog.getByLabel("Mensaje del cliente").fill("¿Cuánto sale el Flip 6?");
  await dialog.getByLabel("Mensaje del cliente").press("Enter");
  await expect(result).toContainText("En producción respondería en modo borrador.");
});

test("says when a saved agent would not answer the chosen combination", async ({ page }) => {
  await login(page, "/app/agents");
  await page.getByRole("button", { name: "Probar Postventa" }).click();
  const dialog = page.getByRole("dialog", { name: "Probar Postventa" });
  await dialog.getByLabel("Canal").selectOption({ label: "WhatsApp" });
  await dialog.getByLabel("Mensaje del cliente").fill("Hola");
  await dialog.getByRole("button", { name: "Enviar" }).click();
  await expect(dialog.getByRole("region", { name: "Resultado de la prueba" })).toContainText(
    "Este agente no respondería esta combinación en producción.",
  );
});

test("shows a handoff with its reason", async ({ page }) => {
  await login(page, "/app/agents");
  await page.getByRole("button", { name: "Probar Ventas" }).click();
  const dialog = page.getByRole("dialog", { name: "Probar Ventas" });
  await dialog.getByLabel("Mensaje del cliente").fill("Quiero hablar con una persona");
  await dialog.getByRole("button", { name: "Enviar" }).click();

  const result = dialog.getByRole("region", { name: "Resultado de la prueba" });
  await expect(result).toContainText("El agente derivaría a una persona");
  await expect(result).toContainText("Motivo: El cliente pidió hablar con una persona.");
  await expect(dialog.getByRole("list", { name: "Conversación de prueba" }).getByRole("listitem")).toHaveCount(1);
});

test("tests an unsaved agent from the editor", async ({ page }) => {
  await login(page, "/app/agents");
  await page.getByRole("button", { name: "Nuevo agente" }).click();
  const editor = page.getByRole("dialog", { name: "Nuevo agente" });
  await expect(editor.getByRole("button", { name: "Probar agente" })).toBeDisabled();
  await editor.getByLabel("Nombre").fill("Borrador");
  await editor.getByRole("button", { name: "Probar agente" }).click();

  const dialog = page.getByRole("dialog", { name: "Probar Borrador" });
  await dialog.getByLabel("Mensaje del cliente").fill("Hola");
  await dialog.getByRole("button", { name: "Enviar" }).click();
  const result = dialog.getByRole("region", { name: "Resultado de la prueba" });
  await expect(result).toContainText("Guardá el agente para ver el modo que aplicaría.");
  await dialog.getByRole("button", { name: "Cerrar" }).click();
  await expect(dialog).toBeHidden();
  await expect(editor).toBeVisible();
  await expect(editor.getByLabel("Nombre")).toHaveValue("Borrador");
});

test("explains when the test limit was reached", async ({ page }) => {
  await resetApi("agents-limited");
  await login(page, "/app/agents");
  await page.getByRole("button", { name: "Probar Ventas" }).click();
  const dialog = page.getByRole("dialog", { name: "Probar Ventas" });
  await dialog.getByLabel("Mensaje del cliente").fill("Hola");
  await dialog.getByRole("button", { name: "Enviar" }).click();
  await expect(dialog.getByRole("alert")).toContainText("Hiciste muchas pruebas seguidas");
  await expect(dialog.getByLabel("Mensaje del cliente")).toHaveValue("Hola");
  await expect(dialog.getByText("Escribí el primer mensaje del cliente para empezar.")).toBeVisible();
});
