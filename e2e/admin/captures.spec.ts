import type { Page } from "@playwright/test";
import { ADMIN_MOCK_ORIGIN } from "../ports.ts";
import { enterAdmin, enterCode, expect, INVALID_CODE, openMenu, resetAdmin, signIn, test, VALID_CODE } from "./support.ts";

const DIR = process.env.SCREENSHOT_DIR;

async function shot(page: Page, name: string, scheme: string) {
  await page.waitForTimeout(500);
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
    await page.reload();
    await expect(page.getByText("Se cortó la conexión con BoxLead")).toBeVisible();
    await shot(page, "09-sin-conexion", scheme);
  });
}
