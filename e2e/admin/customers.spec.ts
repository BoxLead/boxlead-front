import type { Page, Request } from "@playwright/test";
import { RESELLERS } from "../admin-mock/customers.ts";
import { resetCustomers, routeResellers, routeUsage, section } from "./customers-support.ts";
import { enterAdmin, expect, expectAccessible, horizontalOverflow, test, openFilters, expireAdminSession, reauthenticate } from "./support.ts";

const ANA = "0c000000-0000-4000-8000-000000000001";
const DIEGO = "0c000000-0000-4000-8000-000000000004";
const CLIENT_08 = "0c000000-0000-4000-8000-000000000008";
const REASON = "Lo pidió el cliente por mail";

async function confirm(page: Page, title: string, button: string, path: string): Promise<Request> {
  const dialog = page.getByRole("dialog", { name: title });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Motivo").fill(REASON);
  const request = page.waitForRequest((req) => new URL(req.url()).pathname === path && req.method() !== "OPTIONS");
  await dialog.getByRole("button", { name: button, exact: true }).click();
  const sent = await request;
  await expect(dialog).toBeHidden();
  return sent;
}

test("the overview shows the month and its amounts to finance", async ({ page }) => {
  await resetCustomers(["FINANCE"]);
  await enterAdmin(page, "/");
  await expect(page.getByRole("heading", { level: 1, name: "Inicio" })).toBeVisible();
  await expect(page.locator(".stat-card").filter({ hasText: "Usuarios" })).toContainText("24");
  await expect(section(page, "Suscripciones por estado")).toContainText("Cuota impaga");
  await expect(section(page, "Ingresos del mes")).toBeVisible();
  await expect(section(page, "Comisiones")).toContainText("Aprobadas sin liquidar");
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  await expectAccessible(page);
});

test("the overview keeps the amounts away from support and changes the month", async ({ page }) => {
  await resetCustomers(["SUPPORT"]);
  await enterAdmin(page, "/");
  await expect(page.getByText("Los ingresos y las comisiones los ven Finanzas y Dueño.")).toBeVisible();
  await expect(section(page, "Ingresos del mes")).toHaveCount(0);
  await page.goto("/?month=2025-02");
  await expect(page.getByRole("group", { name: "Mes" })).toContainText("Febrero de 2025");
  await page.getByRole("button", { name: /Mes anterior/ }).click();
  await expect(page).toHaveURL(/month=2025-01/);
  await expect(page.getByRole("group", { name: "Mes" })).toContainText("Enero de 2025");
  await expect(page.locator(".stat-card").filter({ hasText: "Usuarios" })).toContainText("0");
});

test("the overview of a past month counts the users at its close", async ({ page }) => {
  await resetCustomers(["FINANCE"]);
  const past = new Date(Date.now() - 100 * 86_400_000).toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).slice(0, 7);
  const label = new Date(`${past}-15T12:00:00-03:00`).toLocaleDateString("es-AR", { month: "long", year: "numeric", timeZone: "America/Argentina/Buenos_Aires" });
  await enterAdmin(page, `/?month=${past}`);
  const users = page.locator(".stat-card").filter({ hasText: "Usuarios" });
  await expect(users).toContainText(label);
  await expect(users).not.toContainText("Hoy");
  await expect(users.locator(".stat-value")).not.toHaveText("24");
  await expect(page.locator(".stat-card").filter({ hasText: "Demos vigentes" })).toContainText("Hoy");
  await expect(section(page, "Ingresos del mes")).toContainText("No hubo cobros en este mes.");
  await expect(section(page, "Comisiones")).toContainText("13.050,00");
  await expect(section(page, "Comisiones")).not.toContainText("19.140,00");
});

test("the overview shows zeros when there is nothing yet", async ({ page }) => {
  await resetCustomers(["OWNER"], "default");
  await enterAdmin(page, "/");
  await expect(page.locator(".stat-card").filter({ hasText: "Usuarios" })).toContainText("0");
  await expect(section(page, "Suscripciones por estado")).toContainText("Todavía no hay suscripciones.");
  await expect(section(page, "Ingresos del mes")).toContainText("No hubo cobros en este mes.");
  await expect(page.getByText("Todavía no hay nada para mostrar acá")).toHaveCount(0);
});

test("the overview shows an error and loads again", async ({ page }) => {
  await resetCustomers();
  await page.route("**/admin/overview*", (route) => route.fulfill({ status: 500, json: { error: "boom", message: "boom" } }));
  await enterAdmin(page, "/");
  await expect(page.getByText("No pudimos cargar el inicio")).toBeVisible();
  await page.unroute("**/admin/overview*");
  await page.getByRole("button", { name: "Reintentar" }).click();
  await expect(section(page, "Ingresos del mes")).toBeVisible();
});

test("users search, filter, page and open a detail", async ({ page }) => {
  await resetCustomers(["SUPPORT"]);
  await enterAdmin(page, "/usuarios");
  await expect(page.getByText("1 a 20 de 24")).toBeVisible();
  await page.getByRole("button", { name: "Siguiente" }).click();
  await expect(page.getByText("21 a 24 de 24")).toBeVisible();
  await openFilters(page);
  await page.getByLabel("Suscripción").selectOption("PAUSED");
  await expect(page.getByRole("link", { name: "diego.fernandez@example.com" })).toBeVisible();
  await expect(page.getByText("1 a 1 de 1")).toBeVisible();
  await page.getByRole("searchbox", { name: "Buscar" }).fill("nadie");
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(page.getByText("Nada coincide con estos filtros")).toBeVisible();
  await page.getByRole("button", { name: "Limpiar", exact: true }).first().click();
  await expect(page.getByText("1 a 20 de 24")).toBeVisible();
  await expect(page.getByRole("searchbox", { name: "Buscar" })).toHaveValue("");
  await page.getByRole("searchbox", { name: "Buscar" }).fill("ruiz");
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(page.getByText("1 a 1 de 1")).toBeVisible();
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  await page.getByRole("link", { name: "carla.ruiz@example.com" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "carla.ruiz@example.com" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Ubicación" })).toContainText("Usuarios");
  await expect(section(page, "Suscripción")).toContainText("Cuota impaga");
});

test("users keep their filters and page through a reload and going back", async ({ page }) => {
  await resetCustomers(["SUPPORT"]);
  await enterAdmin(page, "/usuarios");
  await expect(page.getByText("1 a 20 de 24")).toBeVisible();
  await page.getByRole("button", { name: "Siguiente" }).click();
  await expect(page.getByText("21 a 24 de 24")).toBeVisible();
  await expect(page).toHaveURL(/\?page=2$/);
  await page.reload();
  await expect(page.getByText("21 a 24 de 24")).toBeVisible();
  await page.goBack();
  await expect(page.getByText("1 a 20 de 24")).toBeVisible();
  await expect(page).not.toHaveURL(/page=/);
  await openFilters(page);
  await page.getByLabel("Suscripción").selectOption("PAUSED");
  await expect(page.getByText("1 a 1 de 1")).toBeVisible();
  await expect(page).toHaveURL(/status=PAUSED/);
  await page.reload();
  await expect(page.getByText("1 a 1 de 1")).toBeVisible();
  await expect(page.getByLabel("Suscripción")).toHaveValue("PAUSED");
  await page.goBack();
  await expect(page.getByText("1 a 20 de 24")).toBeVisible();
  await expect(page).not.toHaveURL(/status=/);
});

test("users refuse a link with filters core would reject and offer to clear them", async ({ page }) => {
  await resetCustomers(["SUPPORT"]);
  await enterAdmin(page, "/usuarios?createdFrom=2026-10-27&createdTo=2026-10-01&query=a");
  await expect(page.getByText("Revisá los filtros")).toBeVisible();
  await page.getByRole("button", { name: "Limpiar filtros" }).click();
  await expect(page.getByText("1 a 20 de 24")).toBeVisible();
  await page.goto("/usuarios?page=9");
  await expect(page.getByText("Esta página está vacía")).toBeVisible();
  await page.getByRole("button", { name: "Ir a la primera página" }).click();
  await expect(page.getByText("1 a 20 de 24")).toBeVisible();
});

test("users show an empty list and an error", async ({ page }) => {
  await resetCustomers(["OWNER"], "default");
  await enterAdmin(page, "/usuarios");
  await expect(page.getByText("Cuando alguien cree su cuenta en BoxLead aparece en esta lista.")).toBeVisible();
  await page.route("**/admin/customers*", (route) => route.fulfill({ status: 500, json: { error: "boom", message: "boom" } }));
  await page.reload();
  await expect(page.getByText("No pudimos cargar la lista")).toBeVisible();
});

test("the owner pauses, resumes and cancels with a reason", async ({ page }) => {
  await resetCustomers(["OWNER"]);
  await enterAdmin(page, `/usuarios/${ANA}`);
  const subscription = section(page, "Suscripción");
  await expect(subscription).toContainText("Activa");
  await expect(page.getByRole("button", { name: "Reanudar" })).toHaveCount(0);

  await subscription.getByRole("button", { name: "Pausar" }).click();
  await expect(page.getByRole("dialog", { name: "Pausar suscripción" })).toContainText("87.000,00 ARS por período");
  const paused = await confirm(page, "Pausar suscripción", "Pausar", `/admin/customers/${ANA}/subscription/pause`);
  expect(paused.postDataJSON()).toEqual({ reason: REASON });
  await expect(page.getByText("La suscripción quedó pausada.")).toBeVisible();
  await expect(subscription).toContainText("Pausada");

  await subscription.getByRole("button", { name: "Reanudar" }).click();
  expect((await confirm(page, "Reanudar suscripción", "Reanudar", `/admin/customers/${ANA}/subscription/resume`)).postDataJSON()).toEqual({
    reason: REASON,
  });
  await expect(subscription).toContainText("Activa");

  await subscription.getByRole("button", { name: "Cancelar suscripción" }).click();
  await confirm(page, "Cancelar suscripción", "Cancelar suscripción", `/admin/customers/${ANA}/subscription/cancel`);
  await expect(subscription).toContainText("Cancelada");
  await expect(subscription).toContainText("La canceló el equipo");
  await expect(subscription.getByRole("button")).toHaveCount(0);
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
});

test("the detail asks for the code and finishes the action when the admin session expired", async ({ page }) => {
  await resetCustomers(["OWNER"]);
  await enterAdmin(page, `/usuarios/${ANA}`);
  const subscription = section(page, "Suscripción");
  await subscription.getByRole("button", { name: "Pausar" }).click();
  const dialog = page.getByRole("dialog", { name: "Pausar suscripción" });
  await expireAdminSession();
  await dialog.getByLabel("Motivo").fill(REASON);
  await dialog.getByRole("button", { name: "Pausar", exact: true }).click();
  await reauthenticate(page);
  await expect(page.getByText("La suscripción quedó pausada.")).toBeVisible();
  await expect(dialog).toBeHidden();
  await expect(subscription).toContainText("Pausada");
});

test("the dialog asks for a reason before it sends anything", async ({ page }) => {
  await resetCustomers(["OWNER"]);
  await enterAdmin(page, `/usuarios/${DIEGO}`);
  await section(page, "Suscripción").getByRole("button", { name: "Reanudar" }).click();
  const dialog = page.getByRole("dialog", { name: "Reanudar suscripción" });
  await dialog.getByLabel("Motivo").fill("corto");
  await expect(dialog.getByRole("button", { name: "Reanudar", exact: true })).toBeDisabled();
  await dialog.getByRole("button", { name: "Cancelar" }).click();
  await expect(dialog).toBeHidden();
  await expect(section(page, "Suscripción")).toContainText("Pausada");
});

test("the owner adjusts a limit and takes the adjustment back", async ({ page }) => {
  await resetCustomers(["OWNER"]);
  await enterAdmin(page, `/usuarios/${ANA}`);
  const limits = section(page, "Límites");
  const agents = limits.getByRole("row").filter({ hasText: "Pruebas en el playground por hora" });
  await expect(agents).toContainText("60");

  await limits.getByRole("button", { name: "Ajustar pruebas en el playground por hora" }).click();
  const dialog = page.getByRole("dialog", { name: "Ajustar pruebas en el playground por hora" });
  await dialog.getByLabel("Valor").fill("90");
  const set = await confirm(
    page,
    "Ajustar pruebas en el playground por hora",
    "Guardar ajuste",
    `/admin/customers/${ANA}/overrides/PLAYGROUND_RUNS_PER_HOUR`,
  );
  expect(set.method()).toBe("PUT");
  expect(set.postDataJSON()).toEqual({ value: 90, reason: REASON });
  await expect(agents).toContainText("90");
  await expect(agents).toContainText(REASON);

  await limits.getByRole("button", { name: "Quitar el ajuste de pruebas en el playground por hora" }).click();
  const revoked = await confirm(page, "Quitar ajuste", "Quitar ajuste", `/admin/customers/${ANA}/overrides/PLAYGROUND_RUNS_PER_HOUR`);
  expect(revoked.method()).toBe("DELETE");
  expect(revoked.postDataJSON()).toEqual({ reason: REASON });
  await expect(agents).not.toContainText("90");
});

test("support grants, extends and takes back a Demo and sees nothing else", async ({ page }) => {
  await resetCustomers(["SUPPORT"]);
  await enterAdmin(page, `/usuarios/${CLIENT_08}`);
  const demo = section(page, "Demo");
  await expect(demo).toContainText("No tiene Demo");
  await expect(page.getByRole("button", { name: "Pausar" })).toHaveCount(0);
  await expect(section(page, "Límites").getByRole("button")).toHaveCount(0);
  await expect(section(page, "Quién lo refirió").getByRole("button")).toHaveCount(0);

  await demo.getByRole("button", { name: "Otorgar Demo" }).click();
  await page.getByRole("dialog", { name: "Otorgar Demo" }).getByLabel("Días de Demo").fill("10");
  const granted = await confirm(page, "Otorgar Demo", "Otorgar Demo", `/admin/customers/${CLIENT_08}/demo`);
  expect(granted.postDataJSON()).toEqual({ demoDays: 10, reason: REASON });
  await expect(demo).toContainText("Vigente");

  await demo.getByRole("button", { name: "Extender" }).click();
  const extended = await confirm(page, "Extender Demo", "Extender", `/admin/customers/${CLIENT_08}/demo/extend`);
  const body = extended.postDataJSON() as { endsAt: string; reason: string };
  expect(body.reason).toBe(REASON);
  expect(Date.parse(body.endsAt)).toBeGreaterThan(Date.now() + 10 * 86_400_000);

  await demo.getByRole("button", { name: "Quitar Demo" }).click();
  await confirm(page, "Quitar Demo", "Quitar Demo", `/admin/customers/${CLIENT_08}/demo/revoke`);
  await expect(demo).toContainText("No tiene Demo");
});

test("finance sees the detail without actions", async ({ page }) => {
  await resetCustomers(["FINANCE"]);
  await enterAdmin(page, `/usuarios/${ANA}`);
  await expect(section(page, "Pagos")).toContainText("0003-00000002");
  await expect(page.locator(".section").getByRole("button")).toHaveCount(0);
});

test("the owner corrects who referred a user", async ({ page }) => {
  await resetCustomers(["OWNER"]);
  await routeResellers(page);
  await enterAdmin(page, `/usuarios/${ANA}`);
  const attribution = section(page, "Quién lo refirió");
  await expect(attribution).toContainText("Agencia Norte");
  await expect(attribution).toContainText("Link de referido");
  await attribution.getByRole("button", { name: "Corregir atribución" }).click();
  const dialog = page.getByRole("dialog", { name: "Corregir atribución" });
  await expect(dialog.getByRole("option", { name: "Agencia Norte" })).toHaveCount(0);
  await dialog.getByLabel("Revendedor").selectOption({ label: "Estudio Delta" });
  const sent = await confirm(page, "Corregir atribución", "Corregir", `/admin/customers/${ANA}/attribution`);
  expect(sent.postDataJSON()).toEqual({ resellerId: RESELLERS[1].id, reason: REASON });
  await expect(attribution).toContainText("Estudio Delta");
  await expect(attribution).toContainText("Corrección del equipo");
});

test("the detail fits 320 px, passes axe and explains a missing user", async ({ page }) => {
  await resetCustomers(["OWNER"]);
  await routeUsage(page);
  await enterAdmin(page, `/usuarios/${ANA}`);
  await expect(section(page, "Uso")).toContainText("412 de 1.000");
  await expect(section(page, "Uso").getByRole("row").filter({ hasText: "claude-sonnet-4-5" })).toContainText("1.240");
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  await expectAccessible(page);
  await page.goto("/usuarios/0c000000-0000-4000-8000-000000009999");
  await expect(page.getByText("No encontramos este usuario")).toBeVisible();
});
