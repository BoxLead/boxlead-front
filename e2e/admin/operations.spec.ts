import type { Page, Route } from "@playwright/test";
import { todayInBuenosAires } from "../../admin/src/areas/operations/usage.ts";
import { DIRECTORY, OPERATIONS_SCENARIO } from "../admin-mock/operations.ts";
import { ADMIN_APP_PORT, ADMIN_MOCK_ORIGIN } from "../ports.ts";
import type { AdminScenario } from "./support.ts";
import { adminMockUrl, enterAdmin, expect, expectAccessible, horizontalOverflow, test, openFilters, settled, expireAdminSession, reauthenticate } from "./support.ts";

const DIR = process.env.SCREENSHOT_DIR;
const CORS = {
  "Access-Control-Allow-Origin": `http://localhost:${ADMIN_APP_PORT}`,
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Headers": "Content-Type, Accept, X-Requested-With",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE",
};

function weekAgo(): string {
  return todayInBuenosAires(new Date(Date.now() - 7 * 86_400_000));
}

const USAGE = `/uso?from=${weekAgo()}&to=${todayInBuenosAires()}`;

async function resetOperations(scenario: AdminScenario & { scenario?: string } = {}) {
  const res = await fetch(`${adminMockUrl()}/__reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Requested-With": "boxlead-web" },
    body: JSON.stringify({ scenario: OPERATIONS_SCENARIO, ...scenario }),
  });
  expect(res.ok).toBe(true);
}

function reply(route: Route, status: number, body?: unknown) {
  if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
  return route.fulfill({ status, headers: { ...CORS, "Content-Type": "application/json" }, body: body === undefined ? "" : JSON.stringify(body) });
}

async function answer(page: Page, path: string, status: number, body?: unknown) {
  await page.route((url) => url.origin === ADMIN_MOCK_ORIGIN && url.pathname === path, (route) => reply(route, status, body));
}

async function customerSearch(page: Page) {
  await page.route(
    (url) => url.origin === ADMIN_MOCK_ORIGIN && url.pathname === "/admin/customers",
    (route) => {
      const query = (new URL(route.request().url()).searchParams.get("query") ?? "").toLowerCase();
      const items = DIRECTORY.filter((entry) => entry.email.includes(query) || (entry.name ?? "").toLowerCase().includes(query));
      return reply(route, 200, { items, page: 0, size: 20, totalItems: items.length });
    },
  );
}

async function shot(page: Page, name: string, scheme: string) {
  await settled(page);
  const width = page.viewportSize()?.width ?? 0;
  await page.screenshot({ path: `${DIR}/${name}-${scheme}-${width}.png`, fullPage: true, animations: "disabled" });
}

async function noSideScroll(page: Page) {
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
}

test.describe("usage", () => {
  test("sums tokens and cost per currency and opens the detail of a user", async ({ page }) => {
    await resetOperations({ roles: ["SUPPORT"] });
    await enterAdmin(page, USAGE);
    await expect(page.getByText("Costo estimado en USD")).toBeVisible();
    await expect(page.getByText("Sin moneda de costo")).toBeVisible();
    await expect(page.getByText(/1 fila no tiene costo calculado/)).toBeVisible();
    await expect(page.getByRole("cell", { name: /lucia@agencia-norte\.example/ })).toBeVisible();
    await noSideScroll(page);

    await page.getByLabel("Agrupar por").selectOption("MODEL");
    await expect(page.getByRole("cell", { name: "claude-haiku-4-5" }).first()).toBeVisible();

    await page.getByLabel("Agrupar por").selectOption("");
    await page.getByRole("link", { name: "Ver detalle" }).first().click();
    await expect(page.getByRole("button", { name: "Detalle", pressed: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: /claude-sonnet-4-5/ }).first()).toBeVisible();
    await expect(page.getByRole("cell", { name: /tienda-sur/ })).toHaveCount(0);
    await noSideScroll(page);
  });

  test("shows the empty, the error and a range core would reject", async ({ page }) => {
    await resetOperations({ scenario: "default" });
    await enterAdmin(page, USAGE);
    await expect(page.getByText("No hubo uso de IA en este período")).toBeVisible();
    await page.goto(`/uso?from=${todayInBuenosAires()}&to=${weekAgo()}`);
    await expect(page.getByText("La fecha de inicio tiene que ser anterior a la de fin.")).toBeVisible();
    await answer(page, "/admin/usage/summary", 500, { error: "Internal", message: "boom" });
    await page.goto(USAGE);
    await expect(page.getByText("No pudimos cargar la lista")).toBeVisible();
  });
});

test.describe("consumer requests", () => {
  test("support closes a cancellation and leaves the withdrawal to finance", async ({ page }) => {
    await resetOperations({ roles: ["SUPPORT"] });
    await enterAdmin(page, "/pedidos");
    const withdrawal = page.getByRole("row", { name: /BX-7KX2M9/ });
    await expect(withdrawal.getByText("Lo cierra Finanzas")).toBeVisible();
    await noSideScroll(page);

    await page.getByRole("row", { name: /BX-Q4TD8R/ }).getByRole("button", { name: "Cerrar pedido" }).click();
    const dialog = page.getByRole("dialog", { name: "Cerrar el pedido BX-Q4TD8R" });
    await expect(dialog.getByText(/cancela la suscripción vigente al final del período pago/)).toBeVisible();
    await dialog.getByLabel("Respuesta para el cliente").fill("Cancelamos tu suscripción al final del período.");
    await dialog.getByLabel("Motivo").fill("Baja pedida desde la web");
    await dialog.getByRole("button", { name: "Resolver baja" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("row", { name: /BX-Q4TD8R/ })).toHaveCount(0);

    await page.getByRole("button", { name: "Resueltos" }).click();
    await expect(page.getByRole("row", { name: /BX-Q4TD8R/ })).toContainText("Cancelamos tu suscripción al final del período.");
  });

  test("asks for the code and closes the request when the admin session expired in the dialog", async ({ page }) => {
    await resetOperations({ roles: ["SUPPORT"] });
    await enterAdmin(page, "/pedidos");
    await page.getByRole("row", { name: /BX-Q4TD8R/ }).getByRole("button", { name: "Cerrar pedido" }).click();
    const dialog = page.getByRole("dialog", { name: "Cerrar el pedido BX-Q4TD8R" });
    await dialog.getByLabel("Respuesta para el cliente").fill("Cancelamos tu suscripción al final del período.");
    await expireAdminSession();
    await dialog.getByLabel("Motivo").fill("Baja pedida desde la web");
    await dialog.getByRole("button", { name: "Resolver baja" }).click();
    await reauthenticate(page);
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("row", { name: /BX-Q4TD8R/ })).toHaveCount(0);
  });

  test("finance resolves a withdrawal after reading what it refunds", async ({ page }) => {
    await resetOperations({ roles: ["FINANCE"] });
    await enterAdmin(page, "/pedidos");
    await page.getByRole("row", { name: /BX-7KX2M9/ }).getByRole("button", { name: "Cerrar pedido" }).click();
    const dialog = page.getByRole("dialog", { name: "Cerrar el pedido BX-7KX2M9" });
    await expect(dialog.getByText(/Reembolsa el último pago aprobado y cancela la suscripción en el acto/)).toBeVisible();
    await expect(dialog.locator(".reason-amount")).toContainText("18.900");
    await expect(dialog.locator(".reason-amount")).toContainText("ARS");
    await expect(dialog.getByText("Contraté ayer y me arrepentí, no lo voy a usar.")).toBeVisible();
    await noSideScroll(page);
    await dialog.getByLabel("Motivo").fill("Pedido dentro de los diez días");
    await dialog.getByRole("button", { name: "Resolver arrepentimiento" }).click();
    await expect(dialog.getByText("Escribí la respuesta para el cliente.").first()).toBeVisible();
    await dialog.getByLabel("Respuesta para el cliente").fill("Te devolvemos el pago completo.");
    await dialog.getByRole("button", { name: "Resolver arrepentimiento" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("row", { name: /BX-7KX2M9/ })).toHaveCount(0);

    await page.getByRole("button", { name: "Resueltos" }).click();
    await expect(page.getByRole("row", { name: /BX-7KX2M9/ }).getByRole("link", { name: /^0b0e0000/ })).toBeVisible();
  });

  test("shows the empty and the error", async ({ page }) => {
    await resetOperations({ scenario: "default" });
    await enterAdmin(page, "/pedidos");
    await expect(page.getByText("No hay pedidos pendientes")).toBeVisible();
    await answer(page, "/admin/consumer-requests", 500, { error: "Internal", message: "boom" });
    await page.reload();
    await expect(page.getByText("No pudimos cargar la lista")).toBeVisible();
  });
});

test.describe("team", () => {
  test("grants a role to an existing user and removes the last role of another", async ({ page }) => {
    await resetOperations();
    await customerSearch(page);
    await enterAdmin(page, "/equipo");
    await expect(page.getByText("Único Dueño")).toBeVisible();
    await expect(page.getByText("Ventana vencida")).toBeVisible();
    await noSideScroll(page);

    await page.getByRole("button", { name: "Otorgar rol" }).click();
    await page.getByLabel("Buscar usuario").fill("sofia");
    await page.getByRole("button", { name: "Buscar" }).click();
    await page.getByRole("list", { name: "Resultados" }).getByRole("button", { name: /sofia@estudio-lago\.example/ }).click();
    const noPassword = "Esta cuenta no tiene contraseña. Puede entrar si antes abre sesión en boxlead.app con Google.";
    await expect(page.getByText(noPassword)).toBeVisible();
    await noSideScroll(page);
    await page.getByRole("group", { name: "Rol" }).getByRole("button", { name: "Finanzas" }).click();
    await page.getByRole("button", { name: "Otorgar Finanzas" }).click();
    const grant = page.getByRole("dialog", { name: "Otorgar rol" });
    await expect(grant.getByText(/tiene 24 horas para hacerlo/)).toBeVisible();
    await expect(grant.getByText(noPassword)).toBeVisible();
    await grant.getByLabel("Motivo").fill("Se suma a cobranzas");
    await grant.getByRole("button", { name: "Otorgar Finanzas" }).click();
    await expect(grant).toBeHidden();
    await expect(page.getByRole("row", { name: /sofia@estudio-lago\.example/ })).toContainText("Finanzas");

    await page.getByRole("button", { name: "Quitar Soporte a carla@equipo.example" }).click();
    const revoke = page.getByRole("dialog", { name: "Quitar rol" });
    await expect(revoke.getByText(/Es su último rol\. Se borra su factor TOTP/)).toBeVisible();
    await revoke.getByLabel("Motivo").fill("Dejó el equipo de soporte");
    await revoke.getByRole("button", { name: "Quitar rol" }).click();
    await expect(revoke).toBeHidden();
    await expect(page.getByRole("row", { name: /carla@equipo\.example/ })).toHaveCount(0);

    await page.getByRole("link", { name: "Ver auditoría de equipo@boxlead.app" }).click();
    await expect(page).toHaveURL(/\/auditoria\?actorUserId=0b0e0000-0000-4000-8000-0000000000a1$/);
    await expect(page.getByRole("row", { name: /Rol quitado/ })).toContainText("Dejó el equipo de soporte");
    await expect(page.getByRole("row", { name: /Rol otorgado/ })).toContainText("Se suma a cobranzas");
    await expect(page.getByRole("row", { name: /Suscripción pausada/ })).toHaveCount(0);
  });

  test("shows the error", async ({ page }) => {
    await resetOperations();
    await enterAdmin(page, "/equipo");
    await expect(page.getByRole("row", { name: /equipo@boxlead\.app/ })).toBeVisible();
    await answer(page, "/admin/grants", 500, { error: "Internal", message: "boom" });
    await page.reload();
    await expect(page.getByText("No pudimos cargar la lista")).toBeVisible();
  });
});

test.describe("audit", () => {
  test("filters by action and shows before and after", async ({ page }) => {
    await resetOperations();
    await enterAdmin(page, "/auditoria");
    await expect(page.getByRole("row", { name: /Suscripción pausada/ })).toBeVisible();
    await openFilters(page);
    await page.getByLabel("Acción").selectOption("CONSUMER_REQUEST_RESOLVED");
    await expect(page.getByRole("row", { name: /Suscripción pausada/ })).toHaveCount(0);
    await page.getByRole("button", { name: "Ver antes y después" }).click();
    const dialog = page.getByRole("dialog", { name: "Pedido de consumo cerrado" });
    await expect(dialog.getByText('"status": "RECEIVED"')).toBeVisible();
    await expect(dialog.getByText('"status": "RESOLVED"')).toBeVisible();
    await noSideScroll(page);
    await expectAccessible(page);
  });

  test("finds the events of one target and links the users", async ({ page }) => {
    await resetOperations();
    await enterAdmin(page, "/auditoria");
    await expect(page.getByRole("row", { name: /Suscripción pausada/ })).toBeVisible();
    await openFilters(page);
    await page.getByLabel("Tipo de objetivo").selectOption("CONSUMER_REQUEST");
    await page.getByLabel("Id del objetivo").fill("0b0e0000-0000-4000-8003-000000000004");
    await page.getByLabel("Id del objetivo").press("Enter");
    await expect(page.getByRole("row", { name: /Pedido de consumo cerrado/ })).toBeVisible();
    await expect(page.getByRole("row", { name: /Suscripción pausada/ })).toHaveCount(0);
    await expect(page.getByRole("row", { name: /Pedido de consumo recibido/ })).toHaveCount(0);
    await page.getByRole("row", { name: /Pedido de consumo cerrado/ }).getByRole("link", { name: "0b0e0000" }).click();
    await expect(page).toHaveURL(/\/usuarios\/0b0e0000-0000-4000-8001-000000000004$/);
  });

  test("does not ask core with dates it would reject", async ({ page }) => {
    await resetOperations();
    const asked: string[] = [];
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (url.origin === ADMIN_MOCK_ORIGIN && url.pathname === "/admin/audit") asked.push(url.search);
    });
    await enterAdmin(page, "/auditoria?from=ayer");
    await expect(page.getByText("Una de las fechas no tiene el formato correcto.")).toBeVisible();
    await page.goto("/auditoria?from=2026-10-20&to=2026-10-01");
    await expect(page.getByText("La fecha de inicio tiene que ser anterior a la de fin.")).toBeVisible();
    await noSideScroll(page);
    expect(asked).toEqual([]);
  });

  test("shows the empty and the error", async ({ page }) => {
    await resetOperations();
    await enterAdmin(page, "/auditoria?targetId=nada");
    await expect(page.getByText("Elegí el tipo de objetivo para buscar por id.")).toBeVisible();
    await page.goto("/auditoria?targetType=USER&targetId=nada");
    await expect(page.getByText("Nada coincide con estos filtros")).toBeVisible();
    await answer(page, "/admin/audit", 500, { error: "Internal", message: "boom" });
    await page.reload();
    await expect(page.getByText("No pudimos cargar la lista")).toBeVisible();
  });

  test("is only for owners", async ({ page }) => {
    await resetOperations({ roles: ["FINANCE"] });
    await enterAdmin(page, "/auditoria");
    await expect(page.getByRole("heading", { level: 1, name: "Sin permiso" })).toBeVisible();
  });
});

for (const scheme of ["light", "dark"] as const) {
  test(`captures the operations screens in ${scheme}`, async ({ page }) => {
    test.skip(!DIR, "only with SCREENSHOT_DIR");
    test.setTimeout(90_000);
    await page.emulateMedia({ colorScheme: scheme });
    await resetOperations();
    await customerSearch(page);
    await enterAdmin(page, USAGE);
    await expect(page.getByText("Costo estimado en USD")).toBeVisible();
    await shot(page, "01-uso-resumen", scheme);
    await page.getByRole("link", { name: "Ver detalle" }).first().click();
    await expect(page.getByRole("cell", { name: /claude-sonnet-4-5/ }).first()).toBeVisible();
    await shot(page, "02-uso-detalle", scheme);

    await page.goto("/pedidos");
    await expect(page.getByRole("row", { name: /BX-7KX2M9/ })).toBeVisible();
    await shot(page, "03-pedidos", scheme);
    await page.getByRole("row", { name: /BX-7KX2M9/ }).getByRole("button", { name: "Cerrar pedido" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await shot(page, "04-pedido-arrepentimiento", scheme);
    await page.getByRole("dialog").getByRole("button", { name: "Cancelar" }).click();
    await page.getByRole("button", { name: "Resueltos" }).click();
    await expect(page.getByRole("row", { name: /BX-H8WN3C/ })).toBeVisible();
    await shot(page, "05-pedidos-resueltos", scheme);

    await page.goto("/equipo");
    await expect(page.getByText("Único Dueño")).toBeVisible();
    await shot(page, "06-equipo", scheme);
    await page.getByRole("button", { name: "Otorgar rol" }).click();
    await page.getByLabel("Buscar usuario").fill("sofia");
    await page.getByRole("button", { name: "Buscar" }).click();
    await page.getByRole("list", { name: "Resultados" }).getByRole("button", { name: /sofia/ }).click();
    await shot(page, "07-equipo-otorgar", scheme);
    await page.getByRole("button", { name: "Quitar Soporte a carla@equipo.example" }).click();
    await expect(page.getByRole("dialog", { name: "Quitar rol" })).toBeVisible();
    await shot(page, "08-equipo-quitar", scheme);
    await page.getByRole("dialog", { name: "Quitar rol" }).getByRole("button", { name: "Cancelar" }).click();

    await page.goto("/auditoria");
    await expect(page.getByRole("row", { name: /Suscripción pausada/ })).toBeVisible();
    await shot(page, "09-auditoria", scheme);
    await page.getByRole("row", { name: /Suscripción pausada/ }).getByRole("button", { name: "Ver antes y después" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await shot(page, "10-auditoria-cambio", scheme);

    await answer(page, "/admin/audit", 500, { error: "Internal", message: "boom" });
    await page.reload();
    await expect(page.getByText("No pudimos cargar la lista")).toBeVisible();
    await shot(page, "11-auditoria-error", scheme);

    await answer(page, "/admin/consumer-requests", 200, { items: [], page: 0, size: 50, totalItems: 0 });
    await page.goto("/pedidos");
    await expect(page.getByText("No hay pedidos pendientes")).toBeVisible();
    await shot(page, "12-pedidos-vacio", scheme);
  });
}
