import { expect, test as base, type Page } from "@playwright/test";
import type { AdminRole } from "../../admin/src/api/types.ts";
import { ADMIN_PASSWORD, VALID_CODE } from "../admin-mock/session.ts";
import { ADMIN_MOCK_ORIGIN, adminMockPortOf } from "../ports.ts";

export { expect, VALID_CODE };
export { expectAccessible } from "../support.ts";

export const INVALID_CODE = "000000";
export const ADMIN_EMAIL = "equipo@boxlead.app";

const CSRF_HEADERS = { "Content-Type": "application/json", "X-Requested-With": "boxlead-web" };

export type AdminScenario = {
  roles?: AdminRole[];
  factor?: "none" | "confirmed";
  enrollmentOpen?: boolean;
  locked?: boolean;
};

export function adminMockUrl(): string {
  return `http://localhost:${adminMockPortOf(base.info().parallelIndex)}`;
}

export const test = base.extend({
  context: async ({ context }, provide, testInfo) => {
    const workerApi = `http://localhost:${adminMockPortOf(testInfo.parallelIndex)}`;
    if (workerApi !== ADMIN_MOCK_ORIGIN) {
      await context.route(`${ADMIN_MOCK_ORIGIN}/**`, (route) => {
        const url = route.request().url().replace(ADMIN_MOCK_ORIGIN, workerApi);
        return route.continue({ url }).catch(() => undefined);
      });
    }
    await provide(context);
  },
});

async function call(path: string, body: unknown = {}) {
  const res = await fetch(`${adminMockUrl()}${path}`, { method: "POST", headers: CSRF_HEADERS, body: JSON.stringify(body) });
  expect(res.ok).toBe(true);
}

export function resetAdmin(scenario: AdminScenario = {}) {
  return call("/__reset", scenario);
}

export function expireAdminSession() {
  return call("/__expire-admin-session");
}

export async function signIn(page: Page, path = "/") {
  await page.goto(path);
  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Contraseña").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
}

export async function enterCode(page: Page, code: string, button = "Abrir sesión") {
  await page.getByLabel("Código de 6 números").fill(code);
  await page.getByRole("button", { name: button }).click();
}

export async function enterAdmin(page: Page, path = "/") {
  await signIn(page, path);
  await expect(page.getByRole("heading", { name: "Código de verificación" })).toBeVisible();
  await enterCode(page, VALID_CODE);
  await expect(page.locator(".admin-layout")).toBeVisible();
}

export async function openMenu(page: Page) {
  await expect(page.locator(".admin-layout")).toBeVisible();
  const toggle = page.getByRole("button", { name: "Menú" });
  if ((await toggle.isVisible()) && (await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click();
}

export async function navLinks(page: Page): Promise<string[]> {
  await openMenu(page);
  return page.getByRole("navigation", { name: "Secciones" }).getByRole("link").allTextContents();
}

export async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}
