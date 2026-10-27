import type { Page, Request } from "@playwright/test";
import type { AdminRole } from "../../admin/src/api/types.ts";
import { adminMockUrl, enterAdmin, expect, expectAccessible, horizontalOverflow, resetAdmin, test } from "./support.ts";

const NORTH = "00000101-0b0e-4000-8000-000000000001";
const DRAFT_PAYOUT = "00000503-0b0e-4000-8000-000000000003";
const EXPORTED_PAYOUT = "00000502-0b0e-4000-8000-000000000002";
const REASON = "Pedido del equipo comercial por mail";
const SCREENS = ["/revendedores", `/revendedores/${NORTH}`, "/comisiones", "/liquidaciones", `/liquidaciones/${EXPORTED_PAYOUT}`];

async function seed(roles: AdminRole[]) {
  const res = await fetch(`${adminMockUrl()}/__reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Requested-With": "boxlead-web" },
    body: JSON.stringify({ scenario: "referrals", roles }),
  });
  expect(res.ok).toBe(true);
}

const WEST = { id: "0b0e0000-0000-4000-8000-0000000000f1", email: "oeste@example.com", name: "Martín Oeste", legalName: "Agencia Oeste de Prueba SRL" };
const EMMA = { id: "0b0e0000-0000-4000-8000-0000000000f2", email: "emma@example.com", name: "Emma Ruiz", legalName: null };

async function mockCustomerSearch(page: Page, fail = false) {
  const queries: string[] = [];
  await page.route(/\/admin\/customers\?/, (route) => {
    const query = new URL(route.request().url()).searchParams.get("query") ?? "";
    queries.push(query);
    if (fail) return route.fulfill({ status: 500, contentType: "application/json", body: '{"error":"boom","message":"boom"}' });
    const items = [WEST, EMMA]
      .filter((user) => `${user.email} ${user.name}`.toLowerCase().includes(query.toLowerCase()))
      .map((user) => ({ ...user, createdAt: "2026-10-01T12:00:00Z", planCode: "STARTER", subscriptionStatus: "ACTIVE" }));
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items, page: 0, size: 20, totalItems: items.length }) });
  });
  return queries;
}

async function searchUser(page: Page, text: string) {
  const box = dialog(page);
  await box.getByLabel("Buscar usuario").fill(text);
  await box.getByLabel("Buscar usuario").press("Enter");
}

function dialog(page: Page) {
  return page.getByRole("dialog");
}

async function confirmWithReason(page: Page, button: string, path: string | RegExp, method = "POST"): Promise<Request> {
  const box = dialog(page);
  await box.getByLabel("Motivo").fill(REASON);
  const [request] = await Promise.all([
    page.waitForRequest((req) => req.method() === method && (typeof path === "string" ? req.url().includes(path) : path.test(req.url()))),
    box.getByRole("button", { name: button, exact: true }).click(),
  ]);
  return request;
}

test.describe("empty and failing screens", () => {
  test("every list shows its empty state and its error with a retry", async ({ page }) => {
    await resetAdmin();
    await enterAdmin(page, "/revendedores");
    await expect(page.getByText("Todavía no hay revendedores")).toBeVisible();
    await page.goto("/comisiones");
    await expect(page.getByText("Todavía no hay comisiones")).toBeVisible();
    await page.goto("/liquidaciones");
    await expect(page.getByText("Todavía no hay liquidaciones")).toBeVisible();

    let fail = true;
    await page.route(/\/admin\/payouts$/, (route) =>
      fail ? route.fulfill({ status: 500, contentType: "application/json", body: '{"error":"boom","message":"boom"}' }) : route.fallback(),
    );
    await page.reload();
    await expect(page.getByText("No pudimos cargar la lista")).toBeVisible();
    fail = false;
    await page.getByRole("button", { name: "Reintentar" }).click();
    await expect(page.getByText("Todavía no hay liquidaciones")).toBeVisible();
  });

  test("details show loading, not found and errors", async ({ page }) => {
    await seed(["OWNER"]);
    await enterAdmin(page);
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(/\/admin\/resellers\/[^/]+(\?.*)?$/, async (route) => {
      await held;
      await route.fallback();
    });
    await page.goto(`/revendedores/${NORTH}`);
    await expect(page.getByRole("status").filter({ hasText: "Cargando…" })).toBeAttached();
    release();
    await expect(page.getByRole("heading", { level: 1, name: "Agencia Norte" })).toBeVisible();
    await page.unrouteAll();

    await page.goto("/revendedores/00000000-0000-4000-8000-000000000000");
    await expect(page.getByText("No encontramos este revendedor")).toBeVisible();
    await page.goto("/liquidaciones/00000000-0000-4000-8000-000000000000");
    await expect(page.getByText("No encontramos esta liquidación")).toBeVisible();

    await page.route(/\/admin\/payouts\/[^/]+$/, (route) =>
      route.fulfill({ status: 500, contentType: "application/json", body: '{"error":"boom","message":"boom"}' }),
    );
    await page.goto(`/liquidaciones/${EXPORTED_PAYOUT}`);
    await expect(page.getByText("No pudimos cargar esta pantalla")).toBeVisible();
    await expect(page.getByRole("button", { name: "Reintentar" })).toBeVisible();
  });
});

test.describe("roles", () => {
  test("support sees the reseller without tax data, commissions or actions", async ({ page }) => {
    await seed(["SUPPORT"]);
    await enterAdmin(page, "/revendedores");
    await expect(page.getByRole("link", { name: "Agencia Norte" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Nuevo revendedor" })).toHaveCount(0);
    await page.getByRole("link", { name: "Agencia Norte" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Agencia Norte" })).toBeVisible();
    await expect(page.getByText("Los datos fiscales y de cobro los ve solo Finanzas.")).toBeVisible();
    await expect(page.getByText("Los totales de comisión los ve solo Finanzas.")).toBeVisible();
    await expect(page.getByText("30-11111111-9")).toHaveCount(0);
    for (const name of ["Nuevo código", "Desactivar", "Atribuir cliente", "Cambiar revendedor", "Armar liquidación"]) {
      await expect(page.getByRole("button", { name })).toHaveCount(0);
    }
    await expectAccessible(page);
  });

  test("finance sees tax data and can build payouts but not touch codes", async ({ page }) => {
    await seed(["FINANCE"]);
    await enterAdmin(page, `/revendedores/${NORTH}`);
    await expect(page.getByText("30-11111111-9")).toBeVisible();
    await expect(page.getByText("Devengada")).toBeVisible();
    await expect(page.getByRole("button", { name: "Armar liquidación" })).toBeVisible();
    for (const name of ["Nuevo código", "Desactivar", "Atribuir cliente", "Cambiar revendedor"]) {
      await expect(page.getByRole("button", { name })).toHaveCount(0);
    }
    await page.goto("/revendedores");
    await expect(page.getByRole("link", { name: "Agencia Norte" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Nuevo revendedor" })).toHaveCount(0);
  });
});

test.describe("owner actions", () => {
  test("creates a reseller, issues and disables a code and corrects an attribution", async ({ page }) => {
    await seed(["OWNER"]);
    const queries = await mockCustomerSearch(page);
    await enterAdmin(page, "/revendedores");
    await page.getByRole("button", { name: "Nuevo revendedor" }).click();
    const box = dialog(page);
    await box.getByLabel("Motivo").fill(REASON);
    await box.getByRole("button", { name: "Crear revendedor" }).click();
    await expect(box.getByText("Revisá los datos marcados.")).toBeVisible();
    await expect(box.getByText("Buscá y elegí un usuario.")).toBeVisible();
    await searchUser(page, "nadie");
    await expect(box.getByText("No encontramos usuarios con ese texto.")).toBeVisible();
    await searchUser(page, "oeste");
    await box.getByRole("radio", { name: /oeste@example\.com/ }).check();
    const picked = box.locator(".ref-picked");
    await expect(picked).toContainText("oeste@example.com");
    await expect(picked).toContainText("Agencia Oeste de Prueba SRL");
    await expect(box.getByLabel("Razón social")).toHaveValue("Agencia Oeste de Prueba SRL");
    await box.getByLabel("Nombre visible").fill("Agencia Oeste");
    await box.getByLabel("CUIT").fill("30-44444444-1");
    await box.getByLabel("Condición frente al IVA").selectOption("MONOTRIBUTO");
    const created = await confirmWithReason(page, "Crear revendedor", "/admin/resellers");
    expect(queries).toEqual(["nadie", "oeste"]);
    expect(created.postDataJSON()).toMatchObject({
      userId: WEST.id,
      displayName: "Agencia Oeste",
      legalName: "Agencia Oeste de Prueba SRL",
      vatCondition: "MONOTRIBUTO",
      payoutMethod: null,
      reason: REASON,
    });
    await expect(page.getByRole("heading", { level: 1, name: "Agencia Oeste" })).toBeVisible();
    await expect(page.getByText("Todavía no tiene códigos.")).toBeVisible();

    await page.getByRole("button", { name: "Nuevo código" }).click();
    const issued = await confirmWithReason(page, "Crear código", "/codes");
    expect(issued.postDataJSON()).toEqual({ reason: REASON });
    await expect(page.getByText(/Creamos el código/)).toBeVisible();
    await page.getByRole("button", { name: "Desactivar" }).click();
    const disabled = await confirmWithReason(page, "Desactivar", "/disable");
    expect(disabled.postDataJSON()).toEqual({ reason: REASON });
    await expect(page.getByText("Desactivado", { exact: true }).first()).toBeVisible();

    await page.goto(`/revendedores/${NORTH}`);
    await expect(page.getByText("ana@example.com")).toBeVisible();
    await page.getByRole("button", { name: "Cambiar revendedor" }).first().click();
    await dialog(page).getByLabel("Revendedor").selectOption({ label: "Laura Gómez CM" });
    const moved = await confirmWithReason(page, "Corregir atribución", "/attribution");
    expect(moved.postDataJSON()).toEqual({ resellerId: "00000102-0b0e-4000-8000-000000000002", reason: REASON });
    await expect(page.getByText("La atribución quedó corregida.")).toBeVisible();
    await expect(page.getByText("ana@example.com")).toHaveCount(0);

    await page.getByRole("button", { name: "Atribuir cliente" }).click();
    await expect(dialog(page).getByText("El cliente que elijas pasa a estar atribuido a Agencia Norte", { exact: false })).toBeVisible();
    await searchUser(page, "emma");
    await dialog(page).getByRole("radio", { name: /emma@example\.com/ }).check();
    await expect(dialog(page).getByText("emma@example.com pasa a estar atribuido a Agencia Norte", { exact: false })).toBeVisible();
    await expect(dialog(page).locator(".ref-picked")).toContainText("Emma Ruiz");
    const attributed = await confirmWithReason(page, "Corregir atribución", "/attribution");
    expect(attributed.url()).toContain(`/admin/customers/${EMMA.id}/attribution`);
    expect(attributed.postDataJSON()).toEqual({ resellerId: NORTH, reason: REASON });
    await expect(page.locator(".ref-fact").filter({ hasText: "Clientes atribuidos" })).toContainText("3");
  });

  test("tells when the user search fails", async ({ page }) => {
    await seed(["OWNER"]);
    await mockCustomerSearch(page, true);
    await enterAdmin(page, `/revendedores/${NORTH}`);
    await page.getByRole("button", { name: "Atribuir cliente" }).click();
    await searchUser(page, "emma");
    await expect(dialog(page).getByText("No pudimos buscar")).toBeVisible();
    await dialog(page).getByLabel("Motivo").fill(REASON);
    await dialog(page).getByRole("button", { name: "Corregir atribución" }).click();
    await expect(dialog(page).getByText("Buscá y elegí un usuario.")).toBeVisible();
  });
});

test.describe("finance actions", () => {
  test("approves the releasable commissions with the amount in view", async ({ page }) => {
    await seed(["FINANCE"]);
    await enterAdmin(page, "/comisiones");
    await expect(page.getByRole("checkbox")).toHaveCount(2);
    await page.getByRole("button", { name: "Elegir las liberables" }).click();
    await expect(page.getByText("2 elegidas por $ 24.690,00 ARS.")).toBeVisible();
    await page.getByRole("button", { name: "Aprobar elegidas" }).click();
    await expect(dialog(page).getByText("$ 24.690,00")).toBeVisible();
    const request = await confirmWithReason(page, "Aprobar 2 comisiones", "/admin/commissions/approve");
    const body = request.postDataJSON() as { ids: string[]; reason: string };
    expect(body.reason).toBe(REASON);
    expect(body.ids).toHaveLength(2);
    await expect(page.getByText("Aprobamos 2 comisiones.")).toBeVisible();
    await expect(page.getByRole("checkbox")).toHaveCount(0);
  });

  test("explains a commission that can not change", async ({ page }) => {
    await seed(["FINANCE"]);
    await enterAdmin(page, "/comisiones?status=HELD");
    await page.route(/\/admin\/commissions\/[^/]+\/release$/, (route) =>
      route.fulfill({ status: 409, contentType: "application/json", body: '{"error":"x","message":"x","code":"COMMISSION_NOT_RELEASABLE"}' }),
    );
    await page.getByRole("button", { name: "Liberar" }).click();
    await expect(dialog(page).getByText("$ 8.000,00")).toBeVisible();
    await confirmWithReason(page, "Liberar", "/release");
    await expect(dialog(page).getByText("Esta comisión ya no está retenida. Recargá para ver su estado.")).toBeVisible();
    await page.unrouteAll();
    const released = await confirmWithReason(page, "Liberar", "/release");
    expect(released.postDataJSON()).toEqual({ reason: REASON });
    await expect(page.getByText("La comisión volvió a devengada.")).toBeVisible();
  });

  test("holds and reverses a commission", async ({ page }) => {
    await seed(["FINANCE"]);
    await enterAdmin(page, "/comisiones?status=APPROVED");
    await page.getByRole("button", { name: "Retener" }).first().click();
    const held = await confirmWithReason(page, "Retener", "/hold");
    expect(held.postDataJSON()).toEqual({ reason: REASON });
    await expect(page.getByText("La comisión quedó retenida.")).toBeVisible();
    await page.goto("/comisiones?status=HELD");
    await page.getByRole("button", { name: "Revertir" }).first().click();
    await expect(dialog(page).getByText("No se puede deshacer.", { exact: false })).toBeVisible();
    const reversed = await confirmWithReason(page, "Revertir", "/reverse");
    expect(reversed.postDataJSON()).toEqual({ reason: REASON });
    await expect(page.getByText("Agregamos la reversa de la comisión.")).toBeVisible();
  });

  test("builds a payout, exports its CSV and marks it paid", async ({ page }) => {
    await seed(["FINANCE"]);
    await enterAdmin(page, "/liquidaciones");
    await page.getByRole("button", { name: "Armar liquidación" }).click();
    await dialog(page).getByLabel("Revendedor").selectOption({ label: "Agencia Norte" });
    await expect(dialog(page).getByText("1 movimiento.", { exact: false })).toBeVisible();
    await expect(dialog(page).getByText("$ 15.000,00")).toBeVisible();
    const created = await confirmWithReason(page, "Armar liquidación", "/admin/payouts");
    expect(created.postDataJSON()).toMatchObject({ resellerId: NORTH, reason: REASON });
    await expect(page.getByRole("heading", { level: 1, name: "Detalle de liquidación" })).toBeVisible();
    await expect(page.getByText("Armada", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Marcar pagada" })).toHaveCount(0);

    await page.getByRole("button", { name: "Exportar CSV" }).click();
    await expect(dialog(page).getByText("$ 15.000,00")).toBeVisible();
    const [download, exported] = await Promise.all([page.waitForEvent("download"), confirmWithReason(page, "Exportar CSV", "/export", "GET")]);
    expect(new URL(exported.url()).searchParams.get("reason")).toBe(REASON);
    expect(exported.headers()["x-requested-with"]).toBe("boxlead-web");
    expect(download.suggestedFilename()).toMatch(/^liquidacion-\d{4}-\d{2}-\d{2}-[0-9a-f-]+\.csv$/);
    expect(download.url()).toMatch(/^blob:/);
    await expect(page.getByText("Exportada", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Marcar pagada" }).click();
    await dialog(page).getByLabel("Referencia de la transferencia").fill("OP-778899");
    const paid = await confirmWithReason(page, "Marcar pagada", "/paid");
    expect(paid.postDataJSON()).toEqual({ transferReference: "OP-778899", reason: REASON });
    await expect(page.getByText("La liquidación quedó pagada.")).toBeVisible();
    await expect(page.getByText("OP-778899")).toBeVisible();
    expect(await page.evaluate(() => [window.localStorage.length, window.sessionStorage.length])).toEqual([0, 0]);
  });

  test("a draft payout can be exported from its detail", async ({ page }) => {
    await seed(["FINANCE"]);
    await enterAdmin(page, `/liquidaciones/${DRAFT_PAYOUT}`);
    await expect(page.getByText("Para marcarla pagada primero exportá el CSV.")).toBeVisible();
    await page.getByRole("button", { name: "Exportar CSV" }).click();
    const box = dialog(page);
    await box.getByLabel("Motivo").fill("corto");
    await expect(box.getByRole("button", { name: "Exportar CSV" })).toBeDisabled();
  });
});

test("every referral screen fits without sideways scroll", async ({ page }) => {
  await seed(["OWNER"]);
  await enterAdmin(page);
  for (const path of SCREENS) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator(".skeleton")).toHaveCount(0);
    expect(await horizontalOverflow(page), path).toBeLessThanOrEqual(0);
  }
  await expectAccessible(page);
});

const DIR = process.env.SCREENSHOT_DIR;

for (const scheme of ["light", "dark"] as const) {
  test(`captures the referral screens in ${scheme}`, async ({ page }) => {
    test.skip(!DIR, "only with SCREENSHOT_DIR");
    test.setTimeout(90_000);
    await page.emulateMedia({ colorScheme: scheme });
    const width = page.viewportSize()?.width ?? 0;
    const shot = async (name: string) => {
      await expect(page.locator(".skeleton")).toHaveCount(0);
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${DIR}/${name}-${scheme}-${width}.png`, fullPage: true, animations: "disabled" });
    };

    await resetAdmin();
    await enterAdmin(page, "/revendedores");
    await expect(page.getByText("Todavía no hay revendedores")).toBeVisible();
    await shot("10-revendedores-vacio");

    await seed(["OWNER"]);
    await page.context().clearCookies();
    await enterAdmin(page, "/revendedores");
    await expect(page.getByRole("link", { name: "Agencia Norte" })).toBeVisible();
    await shot("11-revendedores");
    await page.goto(`/revendedores/${NORTH}`);
    await expect(page.getByText("ana@example.com")).toBeVisible();
    await shot("12-revendedor");
    await page.goto("/revendedores");
    await page.getByRole("button", { name: "Nuevo revendedor" }).click();
    await shot("13-nuevo-revendedor");
    await page.keyboard.press("Escape");

    await page.goto("/comisiones");
    await page.getByRole("button", { name: "Elegir las liberables" }).click();
    await shot("14-comisiones");
    await page.getByRole("button", { name: "Aprobar elegidas" }).click();
    await shot("15-aprobar");
    await page.keyboard.press("Escape");

    await page.goto("/liquidaciones");
    await expect(page.getByRole("link", { name: "Laura Gómez CM" }).first()).toBeVisible();
    await shot("16-liquidaciones");
    await page.goto(`/liquidaciones/${EXPORTED_PAYOUT}`);
    await expect(page.getByText("Exportada", { exact: true })).toBeVisible();
    await shot("17-liquidacion");
    await page.getByRole("button", { name: "Marcar pagada" }).click();
    await shot("18-marcar-pagada");
    await page.keyboard.press("Escape");

    await seed(["SUPPORT"]);
    await page.context().clearCookies();
    await enterAdmin(page, `/revendedores/${NORTH}`);
    await expect(page.getByText("Los datos fiscales y de cobro los ve solo Finanzas.")).toBeVisible();
    await shot("19-revendedor-soporte");

    await page.route(/\/admin\/resellers(\?.*)?$/, (route) =>
      route.fulfill({ status: 500, contentType: "application/json", body: '{"error":"boom","message":"boom"}' }),
    );
    await page.goto("/revendedores");
    await expect(page.getByText("No pudimos cargar la lista")).toBeVisible();
    await shot("20-revendedores-error");
  });
}
