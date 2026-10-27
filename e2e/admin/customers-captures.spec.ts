import type { Page } from "@playwright/test";
import { resetCustomers, routeResellers, routeUsage, section } from "./customers-support.ts";
import { enterAdmin, expect, test } from "./support.ts";

const DIR = process.env.SCREENSHOT_DIR;
const ANA = "0c000000-0000-4000-8000-000000000001";
const ERROR = { status: 500, json: { error: "boom", message: "boom" } };

async function shot(page: Page, name: string, scheme: string) {
  await page.waitForTimeout(500);
  const width = page.viewportSize()?.width ?? 0;
  await page.screenshot({ path: `${DIR}/${name}-${scheme}-${width}.png`, fullPage: true, animations: "disabled" });
}

for (const scheme of ["light", "dark"] as const) {
  test(`captures the overview and the users in ${scheme}`, async ({ page }) => {
    test.skip(!DIR, "only with SCREENSHOT_DIR");
    test.setTimeout(90_000);
    await page.emulateMedia({ colorScheme: scheme });

    await resetCustomers(["OWNER"]);
    await page.route("**/admin/overview*", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 4000));
      await route.continue().catch(() => undefined);
    });
    await enterAdmin(page, "/");
    await expect(page.getByRole("status").filter({ hasText: "Cargando" })).toBeAttached();
    await shot(page, "11-inicio-cargando", scheme);
    await page.unroute("**/admin/overview*");
    await page.reload();
    await expect(section(page, "Ingresos del mes")).toBeVisible();
    await shot(page, "12-inicio", scheme);
    await resetCustomers(["OWNER"], "default");
    await page.context().clearCookies();
    await enterAdmin(page, "/");
    await expect(page.getByText("Todavía no hay nada para mostrar acá")).toBeVisible();
    await shot(page, "13-inicio-vacio", scheme);
    await resetCustomers(["OWNER"]);
    await page.context().clearCookies();
    await enterAdmin(page, "/");
    await page.route("**/admin/overview*", (route) => route.fulfill(ERROR));
    await page.reload();
    await expect(page.getByText("No pudimos cargar el inicio")).toBeVisible();
    await shot(page, "14-inicio-error", scheme);
    await page.unroute("**/admin/overview*");

    await page.goto("/usuarios");
    await expect(page.getByText("1 a 20 de 24")).toBeVisible();
    await shot(page, "15-usuarios", scheme);
    await page.goto("/usuarios?query=nadie");
    await expect(page.getByText("Nada coincide con estos filtros")).toBeVisible();
    await shot(page, "16-usuarios-sin-resultados", scheme);
    await page.route("**/admin/customers*", (route) => route.fulfill(ERROR));
    await page.reload();
    await expect(page.getByText("No pudimos cargar la lista")).toBeVisible();
    await shot(page, "17-usuarios-error", scheme);
    await page.unroute("**/admin/customers*");

    await resetCustomers(["SUPPORT"]);
    await page.context().clearCookies();
    await enterAdmin(page, "/");
    await expect(page.getByText("Los ingresos y las comisiones los ven Finanzas y Dueño.")).toBeVisible();
    await shot(page, "18-inicio-soporte", scheme);
  });

  test(`captures the user detail in ${scheme}`, async ({ page }) => {
    test.skip(!DIR, "only with SCREENSHOT_DIR");
    test.setTimeout(90_000);
    await page.emulateMedia({ colorScheme: scheme });
    await resetCustomers(["OWNER"]);
    await routeResellers(page);
    await routeUsage(page);
    await enterAdmin(page, `/usuarios/${ANA}`);
    await expect(section(page, "Límites")).toBeVisible();
    await shot(page, "21-detalle", scheme);
    await section(page, "Suscripción").getByRole("button", { name: "Pausar" }).click();
    await expect(page.getByRole("dialog", { name: "Pausar suscripción" })).toBeVisible();
    await shot(page, "22-detalle-pausar", scheme);
    await page.keyboard.press("Escape");
    await section(page, "Límites").getByRole("button", { name: "Ajustar agentes" }).click();
    await expect(page.getByRole("dialog", { name: "Ajustar agentes" })).toBeVisible();
    await shot(page, "23-detalle-ajuste", scheme);
    await page.keyboard.press("Escape");
    await section(page, "Quién lo refirió").getByRole("button", { name: "Corregir atribución" }).click();
    await expect(page.getByRole("dialog", { name: "Corregir atribución" })).toBeVisible();
    await shot(page, "24-detalle-atribucion", scheme);
    await page.keyboard.press("Escape");

    await page.goto("/usuarios/0c000000-0000-4000-8000-000000000005");
    await expect(section(page, "Demo")).toContainText("Terminada");
    await shot(page, "25-detalle-sin-plan", scheme);
    await page.goto("/usuarios/0c000000-0000-4000-8000-000000009999");
    await expect(page.getByText("No encontramos este usuario")).toBeVisible();
    await shot(page, "26-detalle-no-encontrado", scheme);
    await page.route(`**/admin/customers/${ANA}`, (route) => route.fulfill(ERROR));
    await page.goto(`/usuarios/${ANA}`);
    await expect(page.getByText("No pudimos cargar el usuario")).toBeVisible();
    await shot(page, "27-detalle-error", scheme);
  });
}
