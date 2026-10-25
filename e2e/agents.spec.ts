import type { Page } from "@playwright/test";
import { expect, expectAccessible, login, resetApi, screenshot, test } from "./support.ts";

const agentList = (page: Page) => page.getByRole("list", { name: "Agentes" });
const agentButton = (page: Page, name: string) => agentList(page).getByRole("button", { name: new RegExp(`^${name}(\\s|$)`) });
const editor = (page: Page) => page.getByRole("form", { name: "Configuración del agente" });
const rule = (page: Page, index: number) => editor(page).getByRole("group", { name: `Regla ${index}` });
const playground = (page: Page) => page.locator(".playground");

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

async function showList(page: Page) {
  const back = page.getByRole("button", { name: "Volver" });
  const list = agentList(page);
  await expect(back.or(list)).toBeVisible();
  if (await back.isVisible()) await back.click();
  await expect(list).toBeVisible();
}

async function openAgent(page: Page, name: string) {
  const row = agentButton(page, name);
  await expect(row.or(page.getByRole("button", { name: "Volver" }))).toBeVisible();
  if (!(await row.isVisible())) await showList(page);
  await row.click();
  await expect(page.getByRole("heading", { level: 2, name, exact: true })).toBeVisible();
}

async function openPlayground(page: Page, name: string) {
  await openAgent(page, name);
  await page.getByRole("button", { name: "Probar" }).click();
  await expect(playground(page).getByText("Escribí el primer mensaje del cliente para empezar.")).toBeVisible();
}

async function startNewAgent(page: Page) {
  await page.getByRole("button", { name: "Nuevo agente" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Nuevo agente" })).toBeVisible();
}

test.beforeEach(async () => {
  await resetApi("agents");
});

test("lists the agents with where each one works and how it replies", async ({ page }) => {
  await login(page, "/app/agents");
  await expect(page.getByRole("heading", { level: 1, name: "Agentes" })).toBeVisible();
  const rows = agentList(page).getByRole("button");
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText("Ventas");
  await expect(rows.nth(0)).toContainText("Todos los canales · Automático");
  await expect(rows.nth(0)).toContainText("Todos los canales · Presupuesto · Borrador");
  await expect(rows.nth(1)).toContainText("Postventa");
  await expect(rows.nth(1)).toContainText("Pausado");
  await expect(rows.nth(1)).toContainText("Sin instrucciones");
  await expect(rows.nth(1)).toContainText("MercadoLibre · Postventa · Automático");

  await openAgent(page, "Ventas");
  await expect(page.getByRole("switch", { name: "Activar Ventas" })).toBeChecked();
  await openAgent(page, "Postventa");
  await expect(page.getByRole("switch", { name: "Activar Postventa" })).not.toBeChecked();

  await showList(page);
  await expectNoHorizontalScroll(page);
  await expectAccessible(page);
  await screenshot(page, "agents");
});

test("asks to create the first agent when there are none", async ({ page }) => {
  await resetApi("default");
  await login(page, "/app/agents");
  await expect(page.getByText("Todavía no configuraste agentes")).toBeVisible();
  await expect(agentList(page)).toHaveCount(0);
  await expectAccessible(page);

  await startNewAgent(page);
  await expect(editor(page).getByRole("button", { name: "Crear agente" })).toBeDisabled();
  await editor(page).getByLabel("Nombre").fill("Consultas");
  await editor(page).getByRole("button", { name: "Crear agente" }).click();

  await expect(page.getByRole("status").filter({ hasText: "Creaste Consultas." })).toBeVisible();
  await showList(page);
  await expect(agentButton(page, "Consultas")).toContainText("Todos los canales · Automático");
});

test("creates an agent with several rules", async ({ page }) => {
  await login(page, "/app/agents");
  await startNewAgent(page);
  await editor(page).getByLabel("Nombre").fill("Mercado");
  await editor(page).getByLabel("Instrucciones").fill("Respondé siempre con el nombre del producto.");

  await rule(page, 1).getByLabel("Canal").selectOption({ label: "MercadoLibre" });
  await rule(page, 1).getByLabel("Etapa").selectOption({ label: "Preguntas" });
  await rule(page, 1).getByLabel("Modo").selectOption({ label: "Borrador" });

  await editor(page).getByRole("button", { name: "Agregar regla" }).click();
  await rule(page, 2).getByLabel("Categoría").selectOption({ label: "Reclamo" });

  await expectNoHorizontalScroll(page);
  await expectAccessible(page);
  await screenshot(page, "agent-dialog");
  await editor(page).getByRole("button", { name: "Crear agente" }).click();

  await expect(page.getByRole("status").filter({ hasText: "Creaste Mercado." })).toBeVisible();
  await showList(page);
  const created = agentButton(page, "Mercado");
  await expect(created).toContainText("MercadoLibre · Preguntas · Borrador");
  await expect(created).toContainText("Todos los canales · Reclamo · Automático");
  await expect(agentList(page).getByRole("button")).toHaveCount(3);
});

test("stage choices follow the channel and repeated rules block saving", async ({ page }) => {
  await login(page, "/app/agents");
  await startNewAgent(page);
  await editor(page).getByLabel("Nombre").fill("Reglas");

  await expect(rule(page, 1).getByLabel("Etapa").locator("option")).toHaveText(["Todas las etapas", "Preventa", "Postventa"]);
  await rule(page, 1).getByLabel("Canal").selectOption({ label: "WhatsApp" });
  await expect(rule(page, 1).getByLabel("Etapa").locator("option")).toHaveText(["Todas las etapas", "Chats"]);

  await editor(page).getByRole("button", { name: "Agregar regla" }).click();
  await rule(page, 2).getByLabel("Canal").selectOption({ label: "WhatsApp" });
  await expect(editor(page).getByRole("alert")).toContainText("Hay reglas repetidas");
  await expect(editor(page).getByRole("button", { name: "Crear agente" })).toBeDisabled();

  await editor(page).getByRole("button", { name: "Quitar regla 2" }).click();
  await expect(editor(page).getByRole("button", { name: "Crear agente" })).toBeEnabled();
  await expect(editor(page).getByRole("button", { name: "Quitar regla 1" })).toBeDisabled();
});

test("a rule whose category was deleted is shown and must be removed", async ({ page }) => {
  await login(page, "/app/categories");
  await page.getByRole("button", { name: "Eliminar Presupuesto" }).click();
  await page.getByRole("dialog", { name: "¿Eliminar Presupuesto?" }).getByRole("button", { name: "Eliminar" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Eliminaste Presupuesto." })).toBeVisible();

  await page.getByRole("link", { name: "Agentes" }).click();
  await expect(agentButton(page, "Ventas")).toContainText("Todos los canales · Categoría eliminada · Borrador");

  await openAgent(page, "Ventas");
  await expect(rule(page, 2)).toContainText("Esta categoría ya no existe");
  await expect(editor(page).getByRole("button", { name: "Guardar cambios" })).toBeDisabled();
  await editor(page).getByRole("button", { name: "Quitar regla 2" }).click();
  await editor(page).getByRole("button", { name: "Guardar cambios" }).click();

  await expect(page.getByRole("status").filter({ hasText: "Guardaste Ventas." })).toBeVisible();
  await showList(page);
  await expect(agentButton(page, "Ventas")).toContainText("Todos los canales · Automático");
  await expect(agentButton(page, "Ventas")).not.toContainText("Categoría eliminada");
});

test("edits an agent and keeps its enabled state", async ({ page }) => {
  await login(page, "/app/agents");
  await openAgent(page, "Postventa");
  await expect(editor(page).getByLabel("Nombre")).toHaveValue("Postventa");
  await editor(page).getByLabel("Instrucciones").fill("Ayudá con envíos y facturas.");
  await editor(page).getByRole("button", { name: "Guardar cambios" }).click();

  await expect(page.getByRole("status").filter({ hasText: "Guardaste Postventa." })).toBeVisible();
  await expect(editor(page).getByLabel("Instrucciones")).toHaveValue("Ayudá con envíos y facturas.");
  await showList(page);
  await expect(agentButton(page, "Postventa")).toContainText("Pausado");
  await expect(agentButton(page, "Postventa")).not.toContainText("Sin instrucciones");
});

test("pauses and resumes an agent from its card", async ({ page }) => {
  await login(page, "/app/agents");
  await openAgent(page, "Postventa");
  await page.getByRole("switch", { name: "Activar Postventa" }).check();
  await expect(page.getByRole("status").filter({ hasText: "Postventa está activo." })).toBeVisible();
  await showList(page);
  await expect(agentButton(page, "Postventa")).not.toContainText("Pausado");

  await openAgent(page, "Ventas");
  await page.getByRole("switch", { name: "Activar Ventas" }).uncheck();
  await expect(page.getByRole("status").filter({ hasText: "Ventas quedó en pausa." })).toBeVisible();
  await page.reload();
  await showList(page);
  await expect(agentButton(page, "Ventas")).toContainText("Pausado");
  await expect(agentButton(page, "Postventa")).not.toContainText("Pausado");
});

test("deletes an agent after confirming", async ({ page }) => {
  await login(page, "/app/agents");
  await openAgent(page, "Postventa");
  await page.getByRole("button", { name: "Eliminar Postventa" }).click();
  const dialog = page.getByRole("dialog", { name: "¿Eliminar Postventa?" });
  await dialog.getByRole("button", { name: "Cancelar" }).click();
  await showList(page);
  await expect(agentList(page).getByRole("button")).toHaveCount(2);

  await openAgent(page, "Postventa");
  await page.getByRole("button", { name: "Eliminar Postventa" }).click();
  await dialog.getByRole("button", { name: "Eliminar" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Eliminaste Postventa." })).toBeVisible();
  await showList(page);
  await expect(agentList(page).getByRole("button")).toHaveCount(1);
});

test("saves the business context", async ({ page }) => {
  await login(page, "/app/agents");
  await page.getByRole("button", { name: "Contexto del negocio" }).click();
  const panel = page.getByRole("region", { name: "Contexto del negocio" });
  const description = panel.getByLabel("Qué hace tu negocio");
  await expect(description).toHaveValue(/Vendemos audio y accesorios/);
  await expect(panel.getByLabel("Tono")).toHaveValue("cercano y directo");
  await expect(panel.getByRole("button", { name: "Guardar contexto" })).toBeDisabled();

  await description.fill("Vendemos parlantes. Horario de lunes a viernes de 9 a 18.");
  await panel.getByRole("switch", { name: "Categorizar leads automáticamente" }).uncheck();
  await expect(panel.getByRole("switch", { name: "Calificar leads automáticamente" })).toBeChecked();
  await panel.getByRole("switch", { name: "Calificar leads automáticamente" }).uncheck();
  await panel.getByRole("button", { name: "Guardar contexto" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Guardaste el contexto del negocio." })).toBeVisible();
  await expect(panel.getByRole("button", { name: "Guardar contexto" })).toBeDisabled();

  await page.reload();
  await expect(description).toHaveValue("Vendemos parlantes. Horario de lunes a viernes de 9 a 18.");
  await expect(panel.getByRole("switch", { name: "Categorizar leads automáticamente" })).not.toBeChecked();
  await expect(panel.getByRole("switch", { name: "Calificar leads automáticamente" })).not.toBeChecked();
});

test("tests a saved agent as a customer and shows the mode that would apply", async ({ page }) => {
  await login(page, "/app/agents");
  await openPlayground(page, "Ventas");
  await expect(page.getByText("Escribí el primer mensaje del cliente para empezar.")).toBeVisible();

  await playground(page).getByLabel("Canal").selectOption({ label: "WhatsApp" });
  await playground(page).getByLabel("Mensaje del cliente").fill("¿Tienen stock del Flip 6?");
  await playground(page).getByRole("button", { name: "Enviar" }).click();

  const chat = page.getByRole("list", { name: "Conversación de prueba" });
  await expect(chat.getByRole("listitem")).toHaveCount(2);
  await expect(chat).toContainText("¿Tienen stock del Flip 6?");
  await expect(chat).toContainText("¡Hola! Soy Ventas. Gracias por escribir, enseguida te ayudo.");
  const result = page.getByRole("region", { name: "Resultado de la prueba" });
  await expect(result).toContainText("El agente respondería");
  await expect(result).toContainText("En producción respondería en modo automático.");

  await result.getByText("Reglas del canal que aplicó").click();
  await expect(result).toContainText("Largo máximo");
  await expect(result).toContainText("2.000 caracteres");
  await expectNoHorizontalScroll(page);
  await expectAccessible(page);
  await screenshot(page, "agent-playground");

  await playground(page).getByLabel("Categoría del lead").selectOption({ label: "Presupuesto" });
  await expect(playground(page).getByText("Escribí el primer mensaje del cliente para empezar.")).toBeVisible();
  await playground(page).getByLabel("Mensaje del cliente").fill("¿Cuánto sale el Flip 6?");
  await playground(page).getByLabel("Mensaje del cliente").press("Enter");
  await expect(result).toContainText("En producción respondería en modo borrador.");
});

test("says when a saved agent would not answer the chosen combination", async ({ page }) => {
  await login(page, "/app/agents");
  await openPlayground(page, "Postventa");
  await playground(page).getByLabel("Canal").selectOption({ label: "WhatsApp" });
  await playground(page).getByLabel("Mensaje del cliente").fill("Hola");
  await playground(page).getByRole("button", { name: "Enviar" }).click();
  await expect(page.getByRole("region", { name: "Resultado de la prueba" })).toContainText(
    "Este agente no respondería esta combinación en producción.",
  );
});

test("shows a handoff with its reason", async ({ page }) => {
  await login(page, "/app/agents");
  await openPlayground(page, "Ventas");
  await playground(page).getByLabel("Mensaje del cliente").fill("Quiero hablar con una persona");
  await playground(page).getByRole("button", { name: "Enviar" }).click();

  const result = page.getByRole("region", { name: "Resultado de la prueba" });
  await expect(result).toContainText("El agente derivaría a una persona");
  await expect(result).toContainText("Motivo: El cliente pidió hablar con una persona.");
  await expect(page.getByRole("list", { name: "Conversación de prueba" }).getByRole("listitem")).toHaveCount(1);
});

test("tests an unsaved agent from the editor", async ({ page }) => {
  await login(page, "/app/agents");
  await startNewAgent(page);
  await expect(page.getByRole("button", { name: "Probar" })).toBeDisabled();
  await editor(page).getByLabel("Nombre").fill("Borrador");
  await page.getByRole("button", { name: "Probar" }).click();

  await playground(page).getByLabel("Mensaje del cliente").fill("Hola");
  await playground(page).getByRole("button", { name: "Enviar" }).click();
  const result = page.getByRole("region", { name: "Resultado de la prueba" });
  await expect(result).toContainText("Guardá el agente para ver el modo que aplicaría.");
  await page.getByRole("button", { name: "Configuración" }).click();
  await expect(editor(page).getByLabel("Nombre")).toHaveValue("Borrador");
});

test("shows what an agent did and opens the conversation it answered", async ({ page }) => {
  await login(page, "/app/agents");

  await expect(agentButton(page, "Ventas")).toContainText("8 respondidos");
  await expect(page.getByText("4 mensajes no llegaron a ningún agente y 1 lead se etiquetó sin agente.")).toBeVisible();

  await openAgent(page, "Ventas");
  await page.getByRole("button", { name: "Actividad" }).click();
  const stats = page.getByRole("region", { name: "Actividad de Ventas, últimos 30 días" });
  await expect(stats).toContainText("Respondidos");
  await expect(stats).toContainText("8");
  await expect(page.getByRole("list", { name: "Actividad de Ventas" })).toContainText("Respondió");
  await expect(page.getByRole("list", { name: "Actividad de Ventas" })).toContainText("Etiquetó como Presupuesto");
  await expect(page.getByRole("list", { name: "Actividad de Ventas" })).toContainText("Este agente no responde comentarios públicos");
  await expect(page.getByRole("link", { name: "Ver conversación" }).first()).toBeVisible();

  await page.getByRole("link", { name: "Ver conversación" }).first().click();
  await expect(page).toHaveURL(/\/app\/inbox\?id=/);
  await expect(page.getByRole("heading", { name: "Martín Herrera" })).toBeVisible();
});

test("explains when the test limit was reached", async ({ page }) => {
  await resetApi("agents-limited");
  await login(page, "/app/agents");
  await openPlayground(page, "Ventas");
  await playground(page).getByLabel("Mensaje del cliente").fill("Hola");
  await playground(page).getByRole("button", { name: "Enviar" }).click();
  await expect(page.getByRole("alert")).toContainText("Hiciste muchas pruebas seguidas");
  await expect(playground(page).getByLabel("Mensaje del cliente")).toHaveValue("Hola");
  await expect(page.getByText("Escribí el primer mensaje del cliente para empezar.")).toBeVisible();
});
