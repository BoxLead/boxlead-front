import type { Locator, Page, Route } from "@playwright/test";
import { INVITATIONS_EMAIL_SCENARIO, INVITATIONS_SCENARIO, MOCK_RESELLER, MOCK_USERS } from "../admin-mock/invitations.ts";
import { ADMIN_APP_PORT, ADMIN_MOCK_ORIGIN } from "../ports.ts";
import { adminMockUrl, enterAdmin, expect, expectAccessible, horizontalOverflow, resetAdmin, test, openFilters, settled, expireAdminSession, reauthenticate } from "./support.ts";

const REASON = "Pedido del equipo comercial";
const NEW_EMAIL = "ramiro@cafeteriacentral.com";
const INVITATIONS = /\/admin\/invitations(\?|$)/;
const CORS = { "Access-Control-Allow-Origin": `http://localhost:${ADMIN_APP_PORT}`, "Access-Control-Allow-Credentials": "true" };

function fulfill(route: Route, body: unknown) {
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    headers: CORS,
    body: JSON.stringify(body),
  });
}

async function routeDirectory(page: Page) {
  await page.route(`${ADMIN_MOCK_ORIGIN}/admin/resellers?*`, (route) =>
    fulfill(route, { items: [{ ...MOCK_RESELLER, status: "ACTIVE", codes: [] }], page: 0, size: 50, totalItems: 1 }),
  );
  await page.route(`${ADMIN_MOCK_ORIGIN}/admin/customers?*`, (route) => {
    const query = new URL(route.request().url()).searchParams.get("query") ?? "";
    const items = MOCK_USERS.filter((user) => user.email.startsWith(query)).map((user) => ({
      ...user,
      legalName: null,
      createdAt: "2026-09-01T12:00:00Z",
      planCode: null,
      subscriptionStatus: null,
    }));
    return fulfill(route, { items, page: 0, size: 20, totalItems: items.length });
  });
}

async function open(page: Page, scenario = INVITATIONS_SCENARIO, path = "/invitaciones", roles = ["SUPPORT"]) {
  await resetScenario(scenario, roles);
  await routeDirectory(page);
  await enterAdmin(page, path);
  await expect(page.getByRole("heading", { level: 1, name: "Invitaciones y Demo" })).toBeVisible();
}

async function resetScenario(scenario: string, roles: string[]) {
  const res = await fetch(`${adminMockUrl()}/__reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Requested-With": "boxlead-web" },
    body: JSON.stringify({ roles, scenario }),
  });
  expect(res.ok).toBe(true);
}

function dialog(page: Page, name: string): Locator {
  return page.getByRole("dialog", { name }).filter({ has: page.locator("form, .dialog-form") });
}

function row(page: Page, text: string): Locator {
  return page.getByRole("row").filter({ hasText: text });
}

async function confirmWithReason(page: Page, title: string, button: string) {
  const confirm = dialog(page, title);
  await expect(confirm.getByLabel("Motivo")).toBeVisible();
  await expect(confirm.getByRole("button", { name: button })).toBeDisabled();
  await confirm.getByLabel("Motivo").fill(REASON);
  await confirm.getByRole("button", { name: button }).click();
}

function inFiveDays(): string {
  const date = new Date(Date.now() + 5 * 86_400_000);
  return date.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
}

test("creates an invitation and shows its link only once", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await open(page);
  await expect(row(page, "nora@panaderiadelbarrio.com")).toContainText("Agencia Norte");

  await page.getByRole("button", { name: "Nueva invitación" }).click();
  const form = dialog(page, "Nueva invitación");
  await form.getByLabel("Email").fill(NEW_EMAIL);
  await form.getByLabel("La invitación vence el").fill(inFiveDays());
  await form.getByLabel("Días de Demo").fill("21");
  await form.getByLabel("Revendedor").selectOption({ label: MOCK_RESELLER.displayName });
  const created = page.waitForRequest((request) => request.method() === "POST" && request.url().endsWith("/admin/invitations"));
  await form.getByRole("button", { name: "Continuar" }).click();
  await expect(dialog(page, "Crear invitación")).toContainText("21 días");
  await confirmWithReason(page, "Crear invitación", "Crear invitación");
  expect((await created).postDataJSON()).toMatchObject({ email: NEW_EMAIL, demoDays: 21, resellerId: MOCK_RESELLER.id, reason: REASON });

  const linkDialog = dialog(page, "Invitación creada");
  await expect(linkDialog.getByText("Este link no se vuelve a ver")).toBeVisible();
  const link = await linkDialog.getByLabel("Link de la invitación").inputValue();
  expect(link).toMatch(/\/invitacion#[\w-]{43}$/);
  await linkDialog.getByRole("button", { name: "Copiar link" }).click();
  await expect(linkDialog.getByText("Copiaste el link.")).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(link);
  await linkDialog.getByRole("button", { name: "Listo" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await page.content()).not.toContain(link.split("#")[1]);
  expect(page.url()).not.toContain("#");

  await expect(row(page, NEW_EMAIL)).toContainText("Abierta");
  await page.getByRole("button", { name: "Nueva invitación" }).click();
  await form.getByLabel("Email").fill(NEW_EMAIL);
  await form.getByLabel("La invitación vence el").fill(inFiveDays());
  await form.getByRole("button", { name: "Continuar" }).click();
  await confirmWithReason(page, "Crear invitación", "Crear invitación");
  await expect(dialog(page, "Crear invitación").getByText("Ese email ya tiene una invitación abierta.")).toBeVisible();
});

test("tells that the invitation goes by email when there is no link", async ({ page }) => {
  await open(page, INVITATIONS_EMAIL_SCENARIO);
  await page.getByRole("button", { name: "Nueva invitación" }).click();
  const form = dialog(page, "Nueva invitación");
  await form.getByLabel("Email").fill(NEW_EMAIL);
  await form.getByLabel("La invitación vence el").fill(inFiveDays());
  await form.getByRole("button", { name: "Continuar" }).click();
  await confirmWithReason(page, "Crear invitación", "Crear invitación");
  await expect(page.getByText(`Creamos la invitación. Le llega por email a ${NEW_EMAIL}.`)).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("revokes an open invitation with a reason and filters the list", async ({ page }) => {
  await open(page);
  await row(page, "nora@panaderiadelbarrio.com").getByRole("button", { name: "Revocar" }).click();
  await confirmWithReason(page, "Revocar invitación", "Revocar");
  await expect(row(page, "nora@panaderiadelbarrio.com")).toContainText("Revocada");
  await expect(row(page, "nora@panaderiadelbarrio.com").getByRole("button")).toHaveCount(0);
  await expect(page.locator("dialog[open]")).toHaveCount(0);

  await openFilters(page);
  await page.getByLabel("Estado").selectOption({ label: "Vencida" });
  await expect(page.getByRole("row")).toHaveCount(2);
  await expect(row(page, "pablo@talleresunidos.com")).toContainText("Vencida");
  await expect(page).toHaveURL(/status=EXPIRED/);
  await page.getByLabel("Email").fill("zz");
  await page.getByLabel("Email").press("Enter");
  await expect(page.getByText("Nada coincide con estos filtros")).toBeVisible();
});

test("asks for the code and finishes the revoke when the admin session expired in the dialog", async ({ page }) => {
  await open(page);
  await row(page, "nora@panaderiadelbarrio.com").getByRole("button", { name: "Revocar" }).click();
  const confirm = dialog(page, "Revocar invitación");
  await expireAdminSession();
  await confirm.getByLabel("Motivo").fill(REASON);
  await confirm.getByRole("button", { name: "Revocar" }).click();
  await reauthenticate(page);
  await expect(row(page, "nora@panaderiadelbarrio.com")).toContainText("Revocada");
  await expect(page.locator("dialog[open]")).toHaveCount(0);
});

test("grants, extends and takes away a Demo", async ({ page }) => {
  const [, martin, carla, sofia] = MOCK_USERS;
  await open(page, INVITATIONS_SCENARIO, "/invitaciones?vista=demos");
  await expect(row(page, martin.email)).toContainText("Terminada");

  await page.getByRole("button", { name: "Otorgar Demo" }).click();
  const grant = dialog(page, "Otorgar Demo");
  await grant.getByLabel("Buscar usuario").fill(sofia.email);
  await grant.getByLabel("Buscar usuario").press("Enter");
  await grant.getByRole("radio", { name: new RegExp(sofia.email) }).check();
  await grant.getByRole("button", { name: "Continuar" }).click();
  await confirmWithReason(page, "Otorgar Demo", "Otorgar Demo");
  await expect(dialog(page, "Otorgar Demo").getByText(/Ese usuario ya tiene una Demo/)).toBeVisible();
  await dialog(page, "Otorgar Demo").getByRole("button", { name: "Cancelar" }).click();

  await grant.getByLabel("Buscar usuario").fill("carla");
  await grant.getByRole("button", { name: "Buscar" }).click();
  await grant.getByRole("radio", { name: new RegExp(carla.email) }).check();
  await grant.getByLabel("Días de Demo").fill("10");
  await grant.getByRole("button", { name: "Continuar" }).click();
  await confirmWithReason(page, "Otorgar Demo", "Otorgar Demo");
  await expect(page.getByText(`Le otorgaste una Demo a ${carla.email}.`)).toBeVisible();
  await expect(row(page, carla.email).filter({ hasText: "Vigente" })).toHaveCount(1);

  await row(page, martin.email).getByRole("button", { name: "Extender" }).click();
  await dialog(page, "Extender Demo").getByLabel("Nuevo fin").fill(inFiveDays());
  await dialog(page, "Extender Demo").getByRole("button", { name: "Continuar" }).click();
  await expect(dialog(page, "Extender Demo")).toContainText("vuelve a estar vigente");
  await confirmWithReason(page, "Extender Demo", "Extender");
  await expect(row(page, martin.email)).toContainText("Vigente");

  await row(page, sofia.email).getByRole("button", { name: "Quitar" }).click();
  await confirmWithReason(page, "Quitar Demo", "Quitar Demo");
  await expect(row(page, sofia.email)).toContainText("Quitada");
});

test("shows the loading, empty and error states", async ({ page }) => {
  await open(page, "default");
  await expect(page.getByText("Todavía no hay invitaciones")).toBeVisible();
  await page.getByRole("button", { name: "Demos" }).click();
  await expect(page.getByText("Todavía no hay Demos")).toBeVisible();

  let answer: () => void = () => undefined;
  let reached: () => void = () => undefined;
  const requested = new Promise<void>((resolve) => (reached = resolve));
  await page.route(INVITATIONS, async (route) => {
    const held = new Promise<void>((resolve) => (answer = resolve));
    reached();
    await held;
    await route.fulfill({ status: 500, contentType: "application/json", headers: CORS, body: JSON.stringify({ error: "Internal", message: "boom" }) });
  });
  await page.getByRole("button", { name: "Invitaciones" }).click();
  await requested;
  await expect(page.getByRole("status").filter({ hasText: "Cargando…" })).toBeAttached();
  answer();
  await expect(page.getByText("No pudimos cargar la lista")).toBeVisible();
  await page.unroute(INVITATIONS);
  await page.getByRole("button", { name: "Reintentar" }).click();
  await expect(page.getByText("Todavía no hay invitaciones")).toBeVisible();
});

test("shows the actions to an owner and hides the screen from finance", async ({ page }) => {
  await open(page, INVITATIONS_SCENARIO, "/invitaciones", ["OWNER"]);
  await expect(page.getByRole("button", { name: "Nueva invitación" })).toBeVisible();
  await expect(row(page, "nora@panaderiadelbarrio.com").getByRole("button", { name: "Revocar" })).toBeVisible();

  await resetAdmin({ roles: ["FINANCE"] });
  await page.context().clearCookies();
  await enterAdmin(page, "/invitaciones");
  await expect(page.getByText("Tu rol no ve esta pantalla")).toBeVisible();
  await expect(page.getByRole("button", { name: "Nueva invitación" })).toHaveCount(0);
});

test("fits without sideways scroll and passes the accessibility check", async ({ page }) => {
  await open(page);
  await expect(row(page, "nora@panaderiadelbarrio.com")).toBeVisible();
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  await expectAccessible(page);
  await page.getByRole("button", { name: "Nueva invitación" }).click();
  await expect(dialog(page, "Nueva invitación")).toBeVisible();
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Demos" }).click();
  await expect(row(page, MOCK_USERS[0].email)).toBeVisible();
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  await expectAccessible(page);
});

async function shot(page: Page, name: string, scheme: string) {
  await settled(page);
  const width = page.viewportSize()?.width ?? 0;
  await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/${name}-${scheme}-${width}.png`, fullPage: true, animations: "disabled" });
}

for (const scheme of ["light", "dark"] as const) {
  test(`captures invitations and Demo in ${scheme}`, async ({ page, context }) => {
    test.skip(!process.env.SCREENSHOT_DIR, "only with SCREENSHOT_DIR");
    test.setTimeout(60_000);
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.emulateMedia({ colorScheme: scheme });
    await open(page);
    await expect(row(page, "nora@panaderiadelbarrio.com")).toContainText("Agencia Norte");
    await shot(page, "10-invitaciones", scheme);

    await page.getByRole("button", { name: "Nueva invitación" }).click();
    const form = dialog(page, "Nueva invitación");
    await form.getByRole("button", { name: "Continuar" }).click();
    await shot(page, "11-nueva-invitacion-errores", scheme);
    await form.getByLabel("Email").fill(NEW_EMAIL);
    await form.getByLabel("La invitación vence el").fill(inFiveDays());
    await form.getByLabel("Revendedor").selectOption({ label: MOCK_RESELLER.displayName });
    await form.getByRole("button", { name: "Continuar" }).click();
    await dialog(page, "Crear invitación").getByLabel("Motivo").fill(REASON);
    await shot(page, "12-crear-invitacion-motivo", scheme);
    await dialog(page, "Crear invitación").getByRole("button", { name: "Crear invitación" }).click();
    await dialog(page, "Invitación creada").getByRole("button", { name: "Copiar link" }).click();
    await expect(page.getByText("Copiaste el link.")).toBeVisible();
    await shot(page, "13-link-una-vez", scheme);
    await dialog(page, "Invitación creada").getByRole("button", { name: "Listo" }).click();

    await row(page, NEW_EMAIL).getByRole("button", { name: "Revocar" }).click();
    await shot(page, "14-revocar-invitacion", scheme);
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "Demos" }).click();
    await expect(row(page, MOCK_USERS[0].email)).toBeVisible();
    await shot(page, "15-demos", scheme);
    await page.getByRole("button", { name: "Otorgar Demo" }).click();
    const grant = dialog(page, "Otorgar Demo");
    await grant.getByLabel("Buscar usuario").fill("ca");
    await grant.getByLabel("Buscar usuario").press("Enter");
    await grant.getByRole("radio", { name: new RegExp(MOCK_USERS[2].email) }).check();
    await shot(page, "16-otorgar-demo", scheme);
    await page.keyboard.press("Escape");
    await row(page, MOCK_USERS[1].email).getByRole("button", { name: "Extender" }).click();
    await dialog(page, "Extender Demo").getByLabel("Nuevo fin").fill(inFiveDays());
    await shot(page, "17-extender-demo", scheme);
    await page.keyboard.press("Escape");
    await row(page, MOCK_USERS[3].email).getByRole("button", { name: "Quitar" }).click();
    await shot(page, "18-quitar-demo", scheme);
    await page.keyboard.press("Escape");

    await page.route(/\/admin\/demo-grants(\?|$)/, (route) => fulfill(route, { items: [], page: 0, size: 50, totalItems: 0 }));
    await page.reload();
    await expect(page.getByText("Todavía no hay Demos")).toBeVisible();
    await shot(page, "19-demos-vacio", scheme);
    await page.route(INVITATIONS, (route) =>
      route.fulfill({ status: 500, contentType: "application/json", headers: CORS, body: JSON.stringify({ error: "Internal", message: "boom" }) }),
    );
    await page.getByRole("button", { name: "Invitaciones" }).click();
    await expect(page.getByText("No pudimos cargar la lista")).toBeVisible();
    await shot(page, "20-invitaciones-error", scheme);
  });
}
