import type { Page } from "@playwright/test";
import { ADMIN_MOCK_ORIGIN } from "../ports.ts";
import { adminMockUrl, enterAdmin, enterCode, expect, INVALID_CODE, openMenu, resetAdmin, signIn, test, VALID_CODE, settled } from "./support.ts";

const DIR = process.env.SCREENSHOT_DIR;

async function shot(page: Page, name: string, scheme: string) {
  await settled(page);
  const width = page.viewportSize()?.width ?? 0;
  await page.screenshot({ path: `${DIR}/${name}-${scheme}-${width}.png`, fullPage: true, animations: "disabled" });
}

for (const scheme of ["light", "dark"] as const) {
  test(`captures the backoffice in ${scheme}`, async ({ page }) => {
    test.skip(!DIR, "only with SCREENSHOT_DIR");
    await page.emulateMedia({ colorScheme: scheme });

    await resetAdmin({ factor: "none" });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
    await shot(page, "01-entrar", scheme);
    await signIn(page);
    await page.getByRole("button", { name: "Generar código QR" }).click();
    await expect(page.getByRole("img", { name: "Código QR para tu app de autenticación" })).toBeVisible();
    await shot(page, "02-enrolar", scheme);
    await enterCode(page, VALID_CODE, "Confirmar");
    await expect(page.getByText("Tu factor quedó configurado")).toBeVisible();
    await shot(page, "03-codigo", scheme);
    await enterCode(page, INVALID_CODE);
    await expect(page.getByRole("alert")).toBeVisible();
    await shot(page, "04-codigo-invalido", scheme);

    await resetAdmin({ locked: true });
    await page.context().clearCookies();
    await signIn(page);
    await expect(page.getByText("El factor está bloqueado")).toBeVisible();
    await shot(page, "05-bloqueado", scheme);

    await resetAdmin();
    await page.context().clearCookies();
    await enterAdmin(page);
    await expect(page.getByRole("heading", { level: 1, name: "Inicio" })).toBeVisible();
    await shot(page, "06-inicio", scheme);
    await openMenu(page);
    await shot(page, "07-menu", scheme);

    await resetAdmin({ roles: ["SUPPORT"] });
    await page.context().clearCookies();
    await enterAdmin(page, "/facturas");
    await expect(page.getByText("Tu rol no ve esta pantalla")).toBeVisible();
    await shot(page, "08-sin-permiso", scheme);

    await page.route(`${ADMIN_MOCK_ORIGIN}/**`, (route) => route.abort("connectionrefused"));
    await openMenu(page);
    await page.getByRole("link", { name: "Usuarios" }).click();
    await expect(page.getByText("Se cortó la conexión con BoxLead", { exact: true })).toBeVisible();
    await shot(page, "09-sin-conexion", scheme);
  });
}

type Capture = { name: string; path: string; scenario: string; follow?: boolean; ready: string | RegExp; dialog?: string };

const SCREENS: Capture[] = [
  { name: "10-inicio", path: "/", scenario: "customers", ready: "Suscripciones por estado" },
  { name: "11-usuarios", path: "/usuarios", scenario: "customers", ready: "carla.ruiz@example.com" },
  { name: "12-usuario", path: "/usuarios", scenario: "customers", follow: true, ready: "Suscripción" },
  { name: "13-suscripciones", path: "/suscripciones", scenario: "default", ready: "Cuota impaga" },
  { name: "14-pagos", path: "/pagos", scenario: "default", ready: "Aprobado" },
  { name: "15-reembolsos", path: "/reembolsos", scenario: "default", ready: "Sin respuesta" },
  { name: "16-facturas", path: "/facturas", scenario: "default", ready: "Emitida" },
  { name: "17-invitaciones", path: "/invitaciones", scenario: "invitations", ready: "nora@panaderiadelbarrio.com" },
  { name: "18-demos", path: "/invitaciones?vista=demos", scenario: "invitations", ready: "Vigente" },
  { name: "19-revendedores", path: "/revendedores", scenario: "referrals", ready: "Agencia Norte" },
  { name: "20-revendedor", path: "/revendedores", scenario: "referrals", follow: true, ready: "Clics por día" },
  { name: "21-comisiones", path: "/comisiones", scenario: "referrals", ready: "Devengada" },
  { name: "22-liquidaciones", path: "/liquidaciones", scenario: "referrals", ready: "Armada" },
  { name: "23-liquidacion", path: "/liquidaciones", scenario: "referrals", follow: true, ready: "Movimientos" },
  { name: "24-uso", path: "/uso", scenario: "operations", ready: "Costo estimado en USD" },
  { name: "25-pedidos", path: "/pedidos", scenario: "operations", ready: "BX-7KX2M9", dialog: "Cerrar pedido" },
  { name: "26-equipo", path: "/equipo", scenario: "operations", ready: "Único Dueño" },
  { name: "27-auditoria", path: "/auditoria", scenario: "operations", ready: "Ver antes y después", dialog: "Ver antes y después" },
];

async function seed(scenario: string) {
  const res = await fetch(`${adminMockUrl()}/__reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Requested-With": "boxlead-web" },
    body: JSON.stringify({ scenario, roles: ["OWNER"] }),
  });
  expect(res.ok).toBe(true);
}

for (const scheme of ["light", "dark"] as const) {
  test(`captures every screen with data in ${scheme}`, async ({ page }) => {
    test.skip(!DIR, "only with SCREENSHOT_DIR");
    test.setTimeout(240_000);
    await page.emulateMedia({ colorScheme: scheme });
    let scenario = "";
    for (const screen of SCREENS) {
      if (screen.scenario !== scenario) {
        scenario = screen.scenario;
        await seed(scenario);
        await page.context().clearCookies();
        await enterAdmin(page, screen.path);
      } else {
        await page.goto(screen.path);
      }
      if (screen.follow) {
        await page.locator(".data-table a").first().click();
        await expect(page.getByRole("navigation", { name: "Ubicación" })).toBeVisible();
      }
      await expect(page.locator("table, .section, .stat-grid, .facts").getByText(screen.ready).first()).toBeVisible();
      await expect(page.locator(".skeleton")).toHaveCount(0);
      await shot(page, screen.name, scheme);
      if (screen.dialog) {
        await page.getByRole("button", { name: screen.dialog }).first().click();
        await expect(page.getByRole("dialog")).toBeVisible();
        await shot(page, `${screen.name}-dialogo`, scheme);
        await page.keyboard.press("Escape");
      }
    }
  });
}
