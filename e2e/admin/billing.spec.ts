import type { Page } from "@playwright/test";
import type { AdminRole } from "../../admin/src/api/types.ts";
import { PROVIDER_DOWN_SCENARIO, REFUND_IN_PROCESS_SCENARIO } from "../admin-mock/billing.ts";
import { ADMIN_APP_PORT, ADMIN_MOCK_ORIGIN } from "../ports.ts";
import { adminMockUrl, enterAdmin, expect, expectAccessible, horizontalOverflow, test, openFilters, settled, expireAdminSession, reauthenticate } from "./support.ts";

const DIR = process.env.SCREENSHOT_DIR;
const REASON = "Pedido del cliente por mail";
const ANA_SUBSCRIPTION = "5b538453-0000-4000-8000-000000000007";
const ADMIN_APP_ORIGIN = `http://localhost:${ADMIN_APP_PORT}`;

async function resetBilling(roles: AdminRole[], scenario = "default") {
  const res = await fetch(`${adminMockUrl()}/__reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Requested-With": "boxlead-web" },
    body: JSON.stringify({ roles, scenario }),
  });
  expect(res.ok).toBe(true);
}

function row(page: Page, text: string) {
  return page.locator("tbody tr").filter({ hasText: text });
}

async function confirmWithReason(page: Page, button: string) {
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Motivo").fill(REASON);
  const request = page.waitForRequest((req) => req.method() === "POST" && req.url().startsWith(ADMIN_MOCK_ORIGIN));
  await dialog.getByRole("button", { name: button, exact: true }).click();
  return (await request).postDataJSON() as Record<string, unknown>;
}

async function expectFitsTheScreen(page: Page) {
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
}

test("an owner pauses, resumes and cancels subscriptions with a reason", async ({ page }) => {
  await resetBilling(["OWNER"]);
  await enterAdmin(page, "/suscripciones");
  await expect(page.getByRole("heading", { level: 1, name: "Suscripciones" })).toBeVisible();
  const ana = row(page, "ana@example.com");
  await expect(ana).toContainText("Renueva el");
  await expectFitsTheScreen(page);

  await ana.getByRole("button", { name: "Pausar" }).click();
  const dialog = page.getByRole("dialog", { name: "Pausar suscripción" });
  await expect(dialog).toContainText("ana@example.com");
  await expect(dialog).toContainText("87.000,00");
  await expect(dialog).toContainText("ARS");
  await expect(dialog.getByRole("button", { name: "Pausar", exact: true })).toBeDisabled();
  await expectAccessible(page);
  expect(await confirmWithReason(page, "Pausar")).toEqual({ reason: REASON, expectedSubscriptionId: ANA_SUBSCRIPTION });
  await expect(page.getByText("Pausamos la suscripción.")).toBeVisible();
  await expect(ana).toContainText("Pausada");

  await ana.getByRole("button", { name: "Reanudar" }).click();
  expect(await confirmWithReason(page, "Reanudar")).toEqual({ reason: REASON, expectedSubscriptionId: ANA_SUBSCRIPTION });
  await expect(ana).toContainText("Activa");

  await ana.getByRole("button", { name: "Cancelar" }).click();
  await expect(page.getByRole("dialog", { name: "Cancelar suscripción" })).toContainText("No devuelve plata");
  expect(await confirmWithReason(page, "Cancelar suscripción")).toEqual({ reason: REASON, expectedSubscriptionId: ANA_SUBSCRIPTION });
  await expect(ana).toContainText("Cancelada");
  await expect(ana.getByRole("button")).toHaveCount(0);
});

test("an owner acting on a subscription that changed meanwhile gets a conflict and a fresh list", async ({ page }) => {
  await resetBilling(["OWNER"]);
  let lists = 0;
  page.on("request", (request) => {
    if (request.method() === "GET" && new URL(request.url()).pathname === "/admin/subscriptions") lists += 1;
  });
  await enterAdmin(page, "/suscripciones");
  await page.route("**/admin/customers/*/subscription/cancel", (route) =>
    route.fulfill({
      status: 409,
      headers: { "Access-Control-Allow-Origin": ADMIN_APP_ORIGIN, "Access-Control-Allow-Credentials": "true" },
      contentType: "application/json",
      json: { error: "Conflict", message: "The live subscription is not the one you saw", code: "SUBSCRIPTION_CHANGED" },
    }),
  );
  const ana = row(page, "ana@example.com");
  await ana.getByRole("button", { name: "Cancelar" }).click();
  const dialog = page.getByRole("dialog", { name: "Cancelar suscripción" });
  expect(await confirmWithReason(page, "Cancelar suscripción")).toEqual({ reason: REASON, expectedSubscriptionId: ANA_SUBSCRIPTION });
  await expect(dialog).toContainText("La suscripción de este cliente cambió desde que abriste la lista. No tocamos nada");
  await page.unrouteAll({ behavior: "wait" });
  const before = lists;
  await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect.poll(() => lists).toBeGreaterThan(before);
  await expect(ana).toContainText("Activa");
  await ana.getByRole("button", { name: "Pausar" }).click();
  expect(await confirmWithReason(page, "Pausar")).toEqual({ reason: REASON, expectedSubscriptionId: ANA_SUBSCRIPTION });
  await expect(ana).toContainText("Pausada");
});

test("asks for the code and finishes the pause when the admin session expired in the dialog", async ({ page }) => {
  await resetBilling(["OWNER"]);
  await enterAdmin(page, "/suscripciones");
  const ana = row(page, "ana@example.com");
  await ana.getByRole("button", { name: "Pausar" }).click();
  const dialog = page.getByRole("dialog", { name: "Pausar suscripción" });
  await expireAdminSession();
  await dialog.getByLabel("Motivo").fill(REASON);
  await dialog.getByRole("button", { name: "Pausar", exact: true }).click();
  await reauthenticate(page);
  await expect(page.getByText("Pausamos la suscripción.")).toBeVisible();
  await expect(dialog).toBeHidden();
  await expect(ana).toContainText("Pausada");
});

test("subscriptions filter by status and plan through the URL", async ({ page }) => {
  await resetBilling(["SUPPORT"]);
  await enterAdmin(page, "/suscripciones");
  await expect(page.locator("tbody tr")).toHaveCount(7);
  await openFilters(page);
  await page.getByLabel("Estado").selectOption("ACTIVE");
  await expect(page).toHaveURL(/status=ACTIVE/);
  await expect(page.locator("tbody tr")).toHaveCount(2);
  await page.getByLabel("Plan").selectOption("BUSINESS");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(row(page, "diego@example.com")).toContainText("Baja pedida");
  await page.getByRole("button", { name: "Limpiar", exact: true }).first().click();
  await expect(page.locator("tbody tr")).toHaveCount(7);
});

test("only an owner sees the subscription actions and only finance refunds", async ({ page }) => {
  await resetBilling(["FINANCE"]);
  await enterAdmin(page, "/suscripciones");
  await expect(row(page, "ana@example.com")).toBeVisible();
  await expect(page.getByRole("button", { name: /Pausar|Reanudar|Cancelar/ })).toHaveCount(0);
  await page.goto("/pagos");
  await expect(row(page, "carla@example.com").getByRole("button", { name: "Reembolsar" })).toBeVisible();

  await resetBilling(["SUPPORT"]);
  await page.context().clearCookies();
  await enterAdmin(page, "/pagos");
  await expect(row(page, "carla@example.com")).toBeVisible();
  await expect(page.getByRole("button", { name: "Reembolsar" })).toHaveCount(0);
});

test("finance refunds part of a payment and the row keeps what Mercado Pago has not credited yet", async ({ page }) => {
  await resetBilling(["FINANCE"]);
  await enterAdmin(page, "/pagos");
  const carla = row(page, "carla@example.com");
  await expect(carla).toContainText("Reembolsado");
  await expectFitsTheScreen(page);
  await carla.getByRole("button", { name: "Reembolsar" }).click();
  const dialog = page.getByRole("dialog", { name: "Reembolsar pago" });
  await expect(dialog.locator(".billing-facts")).toContainText("67.000,00");
  await expect(dialog.locator(".reason-amount")).toContainText("67.000,00");
  await dialog.getByRole("button", { name: "Parcial" }).click();
  await dialog.getByLabel("Monto a reembolsar en ARS").fill("70.000");
  await dialog.getByLabel("Monto a reembolsar en ARS").blur();
  await expect(dialog).toContainText("Ingresá un monto mayor a cero y de hasta");
  await dialog.getByLabel("Monto a reembolsar en ARS").fill("10.000");
  await expect(dialog.locator(".reason-amount")).toContainText("10.000,00");
  await expectAccessible(page);
  expect(await confirmWithReason(page, "Reembolsar")).toEqual({ amount: { amountMinor: 1000000, currency: "ARS" }, reason: REASON });
  await expect(page.getByText("Mercado Pago aprobó el reembolso.")).toBeVisible();
  await expect(carla).toContainText("Reembolsado $ 20.000,00");
  await expect(carla).toContainText("Pedido y sin acreditar $ 10.000,00");

  await carla.getByRole("button", { name: "Reembolsar" }).click();
  const again = page.getByRole("dialog", { name: "Reembolsar pago" });
  await expect(again.locator(".billing-facts")).toContainText("Pedido y sin acreditar");
  await expect(again.locator(".reason-amount")).toContainText("57.000,00");
  await again.getByRole("button", { name: "Cancelar", exact: true }).click();
});

test("a payment with a total refund on the way offers nothing more to refund", async ({ page }) => {
  await resetBilling(["FINANCE"]);
  await enterAdmin(page, "/pagos?userId=0c78dde6-0000-4000-8000-000000000004");
  await expect(page.locator("tbody tr")).toHaveCount(2);
  const older = page.locator("tbody tr").nth(1);
  await expect(older).toContainText("Pedido y sin acreditar $ 290.000,00");
  await expect(older.getByRole("button", { name: "Reembolsar" })).toHaveCount(0);
});

test("a total refund goes without amount and core refuses money another admin already committed", async ({ page }) => {
  await resetBilling(["FINANCE"]);
  await enterAdmin(page, "/pagos");
  const carla = row(page, "carla@example.com");
  await carla.getByRole("button", { name: "Reembolsar" }).click();
  const dialog = page.getByRole("dialog", { name: "Reembolsar pago" });
  await expect(dialog.locator(".reason-amount")).toContainText("67.000,00");
  const other = await page.context().newPage();
  await other.goto("/pagos");
  await row(other, "carla@example.com").getByRole("button", { name: "Reembolsar" }).click();
  await confirmWithReason(other, "Reembolsar");
  await expect(other.getByText("Mercado Pago aprobó el reembolso.")).toBeVisible();
  await other.close();
  expect(await confirmWithReason(page, "Reembolsar")).toEqual({ reason: REASON });
  await expect(dialog).toContainText("El reembolso supera lo que queda del pago.");
  await dialog.getByRole("button", { name: "Cancelar" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(carla).toContainText("Pedido y sin acreditar $ 67.000,00");
  await expect(carla.getByRole("button", { name: "Reembolsar" })).toHaveCount(0);
});

test("a refund Mercado Pago is processing waits in Reembolsos without a retry", async ({ page }) => {
  await resetBilling(["FINANCE"], REFUND_IN_PROCESS_SCENARIO);
  await enterAdmin(page, "/pagos");
  const carla = row(page, "carla@example.com");
  await carla.getByRole("button", { name: "Reembolsar" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Parcial" }).click();
  await page.getByRole("dialog").getByLabel("Monto a reembolsar en ARS").fill("4.000");
  await confirmWithReason(page, "Reembolsar");
  await expect(page.getByText("Mercado Pago está procesando el reembolso. Vas a ver la respuesta en Reembolsos.")).toBeVisible();
  await expect(carla).toContainText("Reembolsado $ 20.000,00");
  await expect(carla).toContainText("Pedido y sin acreditar $ 4.000,00");

  await page.goto("/reembolsos");
  const processing = page.locator("tbody tr").filter({ hasText: "4.000,00" });
  await expect(processing).toContainText(/En proceso\s*en Mercado Pago/);
  await expect(processing.getByRole("button", { name: "Reintentar" })).toHaveCount(0);
});

test("a refund that Mercado Pago did not answer closes the dialog, is asked for once and can be retried", async ({ page }) => {
  await resetBilling(["FINANCE"], PROVIDER_DOWN_SCENARIO);
  const refunds: string[] = [];
  page.on("request", (req) => {
    if (req.method() === "POST" && /\/admin\/payments\/[^/]+\/refunds$/.test(req.url())) refunds.push(req.url());
  });
  await enterAdmin(page, "/pagos");
  const carla = row(page, "carla@example.com");
  await carla.getByRole("button", { name: "Reembolsar" }).click();
  const dialog = page.getByRole("dialog", { name: "Reembolsar pago" });
  await dialog.getByRole("button", { name: "Parcial" }).click();
  await dialog.getByLabel("Monto a reembolsar en ARS").fill("700");
  expect(await confirmWithReason(page, "Reembolsar")).toEqual({ amount: { amountMinor: 70000, currency: "ARS" }, reason: REASON });
  await expect(page.getByText("Mercado Pago no respondió. Quedó pedido, reintentalo desde Reembolsos en unos minutos.")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Reembolsar", exact: true })).toHaveCount(0);
  await expect(carla).toContainText("Pedido y sin acreditar $ 700,00");
  await expectFitsTheScreen(page);

  await carla.getByRole("button", { name: "Reembolsar" }).click();
  const again = page.getByRole("dialog", { name: "Reembolsar pago" });
  await expect(again.locator(".billing-facts")).toContainText(/Pedido y sin acreditar\s*\$\s700,00/);
  await expect(again.locator(".reason-amount")).toContainText("66.300,00");
  await again.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(refunds).toHaveLength(1);

  await page.goto("/reembolsos");
  const unanswered = page.locator("tbody tr").filter({ hasText: /\$\s700,00/ });
  await expect(unanswered).toHaveCount(1);
  await expect(unanswered).toContainText("Sin respuesta");
  await unanswered.getByRole("button", { name: "Reintentar" }).click();
  const retry = page.getByRole("dialog", { name: "Reintentar reembolso" });
  await expect(retry.locator(".reason-amount")).toContainText("700,00");
  await confirmWithReason(page, "Reintentar");
  await expect(retry).toContainText("Mercado Pago no respondió y el reembolso sigue pedido.");
  await retry.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(page.locator("tbody tr").filter({ hasText: /\$\s700,00/ })).toHaveCount(1);
});

test("finance retries a refund that Mercado Pago did not answer", async ({ page }) => {
  await resetBilling(["FINANCE"]);
  await enterAdmin(page, "/reembolsos");
  await expect(page.getByRole("heading", { level: 1, name: "Reembolsos" })).toBeVisible();
  const waiting = page.locator("tbody tr").filter({ hasText: "Sin respuesta" });
  await expect(waiting).toContainText("Lo que quedaba del pago");
  await expect(waiting).toContainText("290.000,00");
  const inProcess = page.locator("tbody tr").filter({ hasText: /En proceso\s*en Mercado Pago/ });
  await expect(inProcess).toContainText("10.000,00");
  await expect(inProcess.getByRole("button", { name: "Reintentar" })).toHaveCount(0);
  await expectFitsTheScreen(page);
  await waiting.getByRole("button", { name: "Reintentar" }).click();
  const dialog = page.getByRole("dialog", { name: "Reintentar reembolso" });
  await expect(dialog.locator(".reason-amount")).toContainText("290.000,00");
  expect(await confirmWithReason(page, "Reintentar")).toEqual({ reason: REASON });
  await expect(page.getByText("Mercado Pago aprobó el reembolso.")).toBeVisible();
  await expect(page.locator("tbody tr").filter({ hasText: "Sin respuesta" })).toHaveCount(0);
  await openFilters(page);
  await page.getByLabel("Estado").selectOption("REJECTED");
  await expect(page.locator("tbody tr")).toHaveCount(1);
});

test("finance marks an invoice issued with its number and voids another", async ({ page }) => {
  await resetBilling(["FINANCE"]);
  await enterAdmin(page, "/facturas?status=PENDING");
  await expect(page.getByText("Facturas para emitir, emitidas y anuladas, de la más vieja a la más nueva.")).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(3);
  await expect(page.getByRole("button", { name: /Anular/ })).toHaveCount(0);
  await expectFitsTheScreen(page);
  const first = page.locator("tbody tr").first();
  await first.getByRole("button", { name: "Marcar emitida" }).click();
  const dialog = page.getByRole("dialog", { name: "Marcar factura emitida" });
  await expect(dialog).toContainText("Diego Comercio SRL");
  await expect(dialog).toContainText("30-71234567-1");
  await expect(dialog.locator(".reason-amount")).toContainText("290.000,00");
  await dialog.getByLabel("Motivo").fill(REASON);
  await dialog.getByRole("button", { name: "Marcar emitida" }).click();
  await expect(dialog).toContainText("Ingresá el número de la factura.");
  await dialog.getByLabel("Número de factura").fill("0003-00000020");
  expect(await confirmWithReason(page, "Marcar emitida")).toEqual({ invoiceNumber: "0003-00000020", reason: REASON });
  await expect(page.getByText("Marcamos la factura como emitida.")).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(2);

  await page.getByLabel("Estado").selectOption("ISSUED");
  const issued = page.locator("tbody tr").filter({ hasText: "0003-00000020" });
  await issued.getByRole("button", { name: "Anular" }).click();
  await expect(page.getByRole("dialog", { name: "Anular factura" })).toContainText("no vuelve atrás");
  expect(await confirmWithReason(page, "Anular factura")).toEqual({ reason: REASON });
  await expect(page.getByText("Anulamos la factura.")).toBeVisible();
  await expect(issued).toHaveCount(0);
});

const SCREENS = [
  { path: "/suscripciones", title: "Suscripciones", empty: "Todavía no hay suscripciones", api: "/admin/subscriptions" },
  { path: "/pagos", title: "Pagos", empty: "Todavía no hay pagos", api: "/admin/payments" },
  { path: "/reembolsos", title: "Reembolsos", empty: "Todavía no hay reembolsos", api: "/admin/refunds" },
  { path: "/facturas", title: "Facturas", empty: "Todavía no hay facturas", api: "/admin/invoices" },
];

test("every billing screen has its loading, empty and error states", async ({ page }) => {
  test.setTimeout(60_000);
  await resetBilling(["OWNER"], "empty");
  await enterAdmin(page);
  for (const screen of SCREENS) {
    let release = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(`${ADMIN_MOCK_ORIGIN}${screen.api}*`, async (route) => {
      await held;
      await route.fallback();
    });
    await page.goto(screen.path);
    await expect(page.getByRole("heading", { level: 1, name: screen.title })).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: "Cargando…" })).toBeAttached();
    release();
    await expect(page.getByText(screen.empty)).toBeVisible();
    await expectFitsTheScreen(page);
    await page.unrouteAll({ behavior: "wait" });

    await page.route(`${ADMIN_MOCK_ORIGIN}${screen.api}*`, (route) =>
      route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "Internal", message: "boom" }) }),
    );
    await page.goto(screen.path);
    await expect(page.getByText("No pudimos cargar la lista")).toBeVisible();
    await expectFitsTheScreen(page);
    await page.unrouteAll({ behavior: "wait" });
    await page.getByRole("button", { name: "Reintentar" }).click();
    await expect(page.getByText(screen.empty)).toBeVisible();
  }
  await expectAccessible(page);
});

for (const screen of SCREENS) {
  test(`${screen.title} with data passes the accessibility checks`, async ({ page }) => {
    await resetBilling(["OWNER"]);
    await enterAdmin(page, screen.path);
    await expect(page.locator("tbody tr").first()).toBeVisible();
    await expectFitsTheScreen(page);
    await expectAccessible(page);
  });
}

async function shot(page: Page, name: string, scheme: string) {
  await settled(page);
  const width = page.viewportSize()?.width ?? 0;
  await page.screenshot({ path: `${DIR}/${name}-${scheme}-${width}.png`, fullPage: true, animations: "disabled" });
}

for (const scheme of ["light", "dark"] as const) {
  test(`captures the billing screens in ${scheme}`, async ({ page }) => {
    test.skip(!DIR, "only with SCREENSHOT_DIR");
    test.setTimeout(60_000);
    await page.emulateMedia({ colorScheme: scheme });
    await resetBilling(["OWNER"]);
    await enterAdmin(page, "/suscripciones");
    await expect(page.locator("tbody tr").first()).toBeVisible();
    await shot(page, "01-suscripciones", scheme);
    await row(page, "ana@example.com").getByRole("button", { name: "Cancelar" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await shot(page, "02-cancelar-suscripcion", scheme);
    await page.getByRole("dialog").getByRole("button", { name: "Cancelar", exact: true }).click();

    await page.goto("/pagos");
    await expect(page.locator("tbody tr").first()).toBeVisible();
    await shot(page, "03-pagos", scheme);
    await row(page, "carla@example.com").getByRole("button", { name: "Reembolsar" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Parcial" }).click();
    await page.getByRole("dialog").getByLabel("Monto a reembolsar en ARS").fill("10.000");
    await shot(page, "04-reembolso-parcial", scheme);
    await page.getByRole("dialog").getByRole("button", { name: "Cancelar", exact: true }).click();

    await page.goto("/reembolsos");
    await expect(page.locator("tbody tr").first()).toBeVisible();
    await shot(page, "05-reembolsos", scheme);
    await page.locator("tbody tr").filter({ hasText: "Sin respuesta" }).getByRole("button", { name: "Reintentar" }).click();
    await expect(page.getByRole("dialog").locator(".reason-amount")).toBeVisible();
    await shot(page, "06-reintentar", scheme);
    await page.getByRole("dialog").getByRole("button", { name: "Cancelar", exact: true }).click();

    await page.goto("/facturas");
    await expect(page.locator("tbody tr").first()).toBeVisible();
    await shot(page, "07-facturas", scheme);
    await page.locator("tbody tr").filter({ hasText: "Para emitir" }).first().getByRole("button", { name: "Marcar emitida" }).click();
    await shot(page, "08-marcar-emitida", scheme);
    await page.getByRole("dialog").getByRole("button", { name: "Cancelar", exact: true }).click();

    await resetBilling(["OWNER"], "empty");
    await page.context().clearCookies();
    await enterAdmin(page, "/pagos");
    await expect(page.getByText("Todavía no hay pagos")).toBeVisible();
    await shot(page, "09-pagos-vacio", scheme);
    await page.route(`${ADMIN_MOCK_ORIGIN}/admin/invoices*`, (route) =>
      route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "Internal", message: "boom" }) }),
    );
    await page.goto("/facturas");
    await expect(page.getByText("No pudimos cargar la lista")).toBeVisible();
    await shot(page, "10-facturas-error", scheme);
  });
}
