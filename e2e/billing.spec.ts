import type { Page } from "@playwright/test";
import { LEGAL_VERSION } from "./mock-api/billing.ts";
import { DEMO_EMAIL, expect as baseExpect, expectAccessible, login, resetApi, screenshot, settleCheckout, test } from "./support.ts";

const expect = baseExpect.configure({ timeout: 15_000 });
const CHECKOUT_PAGE = /^https:\/\/www\.mercadopago\.com\.ar\/subscriptions\/checkout\?preapproval_id=/;

async function shoot(page: Page, name: string) {
  for (const theme of ["light", "dark"] as const) {
    await page.evaluate((value) => {
      document.documentElement.dataset.theme = value;
    }, theme);
    await screenshot(page, `${name}-${theme}`);
  }
}

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

async function interceptMercadoPago(page: Page) {
  await page.route("https://www.mercadopago.com.ar/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: "<title>Mercado Pago</title><h1>Checkout de prueba</h1>" }),
  );
}

async function fillProfile(page: Page, overrides: Record<string, string> = {}) {
  const values: Record<string, string> = {
    "Razón social o nombre completo": "Negocio SRL",
    CUIT: "20-12345678-6",
    Domicilio: "Calle 1",
    Ciudad: "Rosario",
    Provincia: "Santa Fe",
    "Código postal": "2000",
    ...overrides,
  };
  for (const [label, value] of Object.entries(values)) {
    await page.getByLabel(label, { exact: true }).fill(value);
  }
  await page.getByLabel("Condición frente al IVA").selectOption("RESPONSABLE_INSCRIPTO");
}

test("buying a plan goes to Mercado Pago and the return asks the server", async ({ page }) => {
  test.slow();
  await resetApi("billing-none");
  await interceptMercadoPago(page);
  await login(page, "/app/billing");

  await expect(page.getByRole("heading", { level: 1, name: "Facturación" })).toBeVisible();
  await expect(page.getByText("Sin plan", { exact: true })).toBeVisible();
  const plans = page.getByRole("list", { name: "Planes" });
  const starter = plans.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "Starter" }) });
  await expect(starter).toContainText(/\$\s87\.000/);
  await expect(starter).toContainText("Dólar oficial del Banco Nación del 24 de octubre");
  await expect(starter).toContainText(/PRECIO SIN IMPUESTOS NACIONALES \$\s71\.900,82/);
  await expect(starter).toContainText("Referencia USD 60 con IVA incluido");
  const enterprise = plans.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "Enterprise" }) });
  await expect(enterprise.getByRole("link", { name: "Escribinos" })).toHaveAttribute("href", /^mailto:support@boxlead\.app/);
  await expect(enterprise.getByRole("button")).toHaveCount(0);
  await expect(page.getByText("Todavía no hay pagos")).toBeVisible();
  await expect(page.getByText("Todavía no cargaste tus datos fiscales")).toBeVisible();
  await expectNoHorizontalScroll(page);
  await expectAccessible(page);
  await shoot(page, "billing-empty");

  await starter.getByRole("button", { name: "Contratar Starter" }).click();
  const profile = page.getByRole("dialog", { name: "Tus datos fiscales" });
  await expect(profile).toContainText("Antes de contratar Starter");
  await expect(profile.getByLabel("Email para las facturas")).toHaveValue(DEMO_EMAIL);
  await shoot(page, "billing-checkout-profile");
  await fillProfile(page);
  await profile.getByRole("button", { name: "Seguir" }).click();

  const checkout = page.getByRole("dialog", { name: "Contratar Starter" });
  await expect(checkout).toContainText("Catvin SRL");
  await expect(checkout).toContainText(/Precio final con IVA\s*\$\s87\.000 por mes/);
  await expect(checkout).toContainText(/PRECIO SIN IMPUESTOS NACIONALES \$\s71\.900,82/);
  await expect(checkout).toContainText("Se cobra todos los meses");
  await expect(checkout).toContainText("10 días desde el primer cobro");
  await expect(checkout.getByLabel("Email de tu cuenta de Mercado Pago")).toHaveValue(DEMO_EMAIL);
  await expect(checkout.getByRole("img", { name: /Mercado Pago/ })).toHaveAttribute("src", "/mercadopago/banner.jpg");
  await expect(checkout.getByRole("link", { name: "términos y condiciones", exact: true })).toHaveAttribute(
    "href",
    "https://www.mercadopago.com.ar/ayuda/terminos-y-condiciones_299",
  );
  await expect(checkout.getByRole("link", { name: "los Términos y condiciones" })).toHaveAttribute("href", "/terminos");
  await expect(checkout.getByRole("link", { name: "el Contrato de adhesión" })).toHaveAttribute("href", "/contratos");
  await expectAccessible(page);
  await shoot(page, "billing-checkout-summary");

  await checkout.getByRole("button", { name: "Ir a pagar" }).click();
  await expect(checkout.getByRole("alert")).toHaveText("Para seguir tenés que aceptar las condiciones.");

  await checkout.getByLabel("Email de tu cuenta de Mercado Pago").fill("pagos@negocio.com");
  await checkout.getByRole("checkbox").check();
  const request = page.waitForRequest((req) => req.url().endsWith("/billing/checkout") && req.method() === "POST");
  await checkout.getByRole("button", { name: "Ir a pagar" }).click();
  expect((await request).postDataJSON()).toEqual({
    planCode: "STARTER",
    payerEmail: "pagos@negocio.com",
    acceptedLegal: ["TERMS", "PRIVACY", "ADHESION_CONTRACT"].map((kind) => ({ kind, version: LEGAL_VERSION })),
  });
  await expect(page).toHaveURL(CHECKOUT_PAGE);

  await page.goto("/app/billing/return?collection_status=rejected&status=rejected&preapproval_id=x");
  await expect(page.getByRole("heading", { name: "Estamos confirmando tu pago" })).toBeVisible();
  await shoot(page, "billing-return-loading");
  await settleCheckout("APPROVED");
  await expect(page.getByRole("heading", { name: "Tu pago está confirmado" })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("Ya tenés Starter.")).toBeVisible();
  await expectNoHorizontalScroll(page);
  await expectAccessible(page);
  await shoot(page, "billing-return-approved");

  await page.getByRole("link", { name: "Ver facturación" }).click();
  await expect(page.getByText("Próxima cuota de")).toBeVisible();
  await expect(page.getByRole("list", { name: "Pagos" }).getByRole("listitem")).toHaveCount(1);
});

test("the return never trusts the URL and explains pending and rejected payments", async ({ page }) => {
  test.slow();
  await resetApi("billing-checkout-pending");
  await login(page, "/app/billing/return?status=approved&collection_status=approved");
  await expect(page.getByRole("heading", { name: "Tu pago está pendiente" })).toBeVisible();
  await expect(page.getByText("Tu pago está confirmado")).toHaveCount(0);
  await expectNoHorizontalScroll(page);
  await shoot(page, "billing-return-pending");

  await page.goto("/app/billing");
  await expect(page.getByRole("status").filter({ hasText: "Tu pago de Starter está pendiente" })).toBeVisible();
  await shoot(page, "billing-checkout-pending");

  await resetApi("billing-checkout-rejected");
  await page.goto("/app/billing/return?status=approved");
  await expect(page.getByRole("heading", { name: "Mercado Pago rechazó el pago" })).toBeVisible();
  await expectAccessible(page);
  await shoot(page, "billing-return-rejected");

  await page.getByRole("link", { name: "Probar de nuevo" }).click();
  await expect(page).toHaveURL(/\/app\/billing\?checkout=STARTER$/);
  const checkout = page.getByRole("dialog", { name: "Contratar Starter" });
  await expect(checkout).toBeVisible();
  await checkout.getByRole("button", { name: "Cancelar" }).click();
  await expect(checkout).toBeHidden();
  await expect(page).toHaveURL(/\/app\/billing$/);
  await expect(page.getByRole("alert").filter({ hasText: "Mercado Pago rechazó el pago de Starter" })).toBeVisible();
});

test("the register destination opens the purchase and asks for the billing data first", async ({ page }) => {
  await resetApi("billing-demo");
  await login(page, "/app/billing?checkout=BUSINESS");
  const profile = page.getByRole("dialog", { name: "Tus datos fiscales" });
  await expect(profile).toContainText("Antes de contratar Business");
  await fillProfile(page);
  await profile.getByRole("button", { name: "Seguir" }).click();
  await expect(page.getByRole("dialog", { name: "Contratar Business" })).toContainText(/\$\s290\.000 por mes/);

  await page.goto("/app/billing?checkout=ENTERPRISE");
  await expect(page.getByRole("heading", { level: 1, name: "Facturación" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Planes" })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("a checkout URL outside Mercado Pago is never opened", async ({ page }) => {
  await resetApi("billing-checkout-rejected");
  await page.route("**/billing/checkout", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ checkoutUrl: "https://www.mercadopago.com.ar.evil.test/pagar" }) }),
  );
  await login(page, "/app/billing");
  await page.getByRole("button", { name: "Contratar Business" }).click();
  const checkout = page.getByRole("dialog", { name: "Contratar Business" });
  await checkout.getByRole("checkbox").check();
  await checkout.getByRole("button", { name: "Ir a pagar" }).click();
  await expect(checkout.getByRole("alert")).toContainText("No pudimos abrir el pago de Mercado Pago");
  await expect(page).toHaveURL(/\/app\/billing$/);
});

test("changing plan, undoing a downgrade and canceling", async ({ page }) => {
  test.slow();
  await resetApi("billing-active");
  await login(page, "/app/billing");
  const current = page.getByRole("region", { name: "Tu plan" });
  await expect(current.getByText("Hasta 3 agentes")).toBeVisible();
  await expect(current.getByText("120 de 1.000 respuestas")).toBeVisible();
  await expect(page.getByRole("list", { name: "Pagos" }).getByRole("listitem")).toHaveCount(3);
  await expectNoHorizontalScroll(page);
  await expectAccessible(page);
  await shoot(page, "billing-active");

  await page.getByRole("button", { name: "Cambiar a Business" }).click();
  const upgrade = page.getByRole("dialog", { name: "¿Pasar a Business?" });
  await expect(upgrade).toContainText("El cambio rige ahora");
  await shoot(page, "billing-change-plan");
  await upgrade.getByRole("button", { name: "Pasar a Business" }).click();
  await expect(page.getByText("Ahora tenés Business.")).toBeVisible();
  await expect(page.locator(".billing-current-name")).toHaveText("Business");

  await resetApi("billing-downgrade-pending");
  await page.reload();
  await expect(page.getByText(/^Pasás a Starter el/)).toBeVisible();
  await shoot(page, "billing-downgrade-pending");
  await page.getByRole("button", { name: "Seguir en Business" }).click();
  await expect(page.getByText("Seguís en Business.")).toBeVisible();
  await expect(page.getByText(/^Pasás a Starter el/)).toHaveCount(0);

  await page.getByRole("button", { name: "Cambiar a Starter" }).click();
  const downgrade = page.getByRole("dialog", { name: "¿Pasar a Starter?" });
  await expect(downgrade).toContainText("Seguís con Business hasta el");
  await downgrade.getByRole("button", { name: "Pasar a Starter" }).click();
  await expect(page.getByText(/^Pasás a Starter el/).first()).toBeVisible();

  await page.getByRole("button", { name: "Dar de baja" }).click();
  const cancel = page.getByRole("dialog", { name: "¿Dar de baja tu plan?" });
  await expect(cancel).toContainText("No se te va a cobrar más");
  await shoot(page, "billing-cancel");
  await cancel.getByRole("button", { name: "Dar de baja" }).click();
  await expect(page.getByText(/^Lo diste de baja\. Tenés acceso hasta el/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Dar de baja" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Cambiar a Starter" })).toBeDisabled();
  await expect(page.getByText(/^Podés volver a contratar después del/)).toBeVisible();
  await shoot(page, "billing-canceled");
});

test("a past due plan points to Mercado Pago to change the payment method", async ({ page }) => {
  await resetApi("billing-past-due");
  await login(page, "/app/billing");
  await expect(page.getByText("Mercado Pago no pudo cobrar la cuota.", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: "Cambiar el medio de pago" })).toHaveAttribute("href", CHECKOUT_PAGE);
  await expect(page.getByRole("button", { name: "Cambiar a Business" })).toBeDisabled();
  await expectNoHorizontalScroll(page);
  await shoot(page, "billing-past-due");
});

test("the billing profile explains its validation errors", async ({ page }) => {
  test.slow();
  await resetApi("billing-none");
  await login(page, "/app/billing");
  await page.getByRole("button", { name: "Cargar datos fiscales" }).click();
  const dialog = page.getByRole("dialog", { name: "Datos fiscales" });
  await dialog.getByLabel("Email para las facturas").fill("");
  await dialog.getByRole("button", { name: "Guardar" }).click();
  await expect(dialog.getByText("Completá este dato.")).toHaveCount(8);
  await expectAccessible(page);

  await fillProfile(page, { CUIT: "20-12345678-9" });
  await dialog.getByLabel("Email para las facturas").fill("pagos@negocio.com");
  await dialog.getByRole("button", { name: "Guardar" }).click();
  await expect(dialog.getByLabel("CUIT")).toHaveAttribute("aria-invalid", "true");
  await expect(dialog.getByText("Revisá el CUIT, el dígito verificador no coincide.")).toBeVisible();
  await shoot(page, "billing-profile-errors");

  await page.route("**/billing/profile", (route) => {
    if (route.request().method() !== "PUT") return route.fallback();
    return route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ error: "Validation failed", message: "Validation failed", fields: [{ field: "postalCode", message: "invalid" }] }),
    });
  });
  await dialog.getByLabel("CUIT").fill("20-12345678-6");
  await dialog.getByRole("button", { name: "Guardar" }).click();
  await expect(dialog.getByRole("alert")).toHaveText("Revisá los datos marcados.");
  await expect(dialog.getByLabel("Código postal")).toHaveAttribute("aria-invalid", "true");

  await page.unroute("**/billing/profile");
  await dialog.getByRole("button", { name: "Guardar" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Guardaste tus datos fiscales.")).toBeVisible();
  const saved = page.locator(".billing-profile");
  await expect(saved).toContainText("20-12345678-6");
  await expect(saved).toContainText("Responsable inscripto");
  await expect(saved).toContainText("Calle 1, Rosario, Santa Fe, CP 2000");
  await expectNoHorizontalScroll(page);
  await shoot(page, "billing-profile");
});

test("loading and error states of the billing page", async ({ page }) => {
  test.slow();
  await resetApi("billing-active");
  await page.route("**/billing/summary", () => undefined);
  await login(page, "/app/billing");
  await expect(page.locator(".billing-card-skeleton")).toBeVisible();
  await shoot(page, "billing-loading");

  await page.unroute("**/billing/summary");
  const failure = { status: 500, contentType: "application/json", body: JSON.stringify({ error: "Server error", message: "No pudimos responder." }) };
  await page.route("**/billing/summary", (route) => route.fulfill(failure));
  await page.route("**/billing/plans", (route) => route.fulfill(failure));
  await page.route("**/billing/payments*", (route) => route.fulfill(failure));
  await page.reload();
  const error = page.getByRole("alert").filter({ hasText: "No pudimos cargar tu plan" });
  await expect(error).toBeVisible();
  await expectAccessible(page);
  await shoot(page, "billing-error");

  await page.unroute("**/billing/summary");
  await error.getByRole("button", { name: "Reintentar" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "No pudimos cargar los planes" })).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: "No pudimos cargar tus pagos" })).toBeVisible();
  await expectNoHorizontalScroll(page);
  await shoot(page, "billing-sections-error");

  await page.route("**/billing/summary", (route) => route.fulfill(failure));
  await page.goto("/app/billing/return");
  await expect(page.getByRole("heading", { name: "Estamos confirmando tu pago" })).toBeVisible();
});
