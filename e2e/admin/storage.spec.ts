import { NAV_ITEMS } from "../../admin/src/nav.ts";
import { enterCode, expect, openMenu, resetAdmin, signIn, test, VALID_CODE } from "./support.ts";

declare global {
  interface Window {
    storageAccess: string[];
  }
}

test("never touches localStorage, sessionStorage or IndexedDB", async ({ page }) => {
  test.setTimeout(60_000);
  await page.addInitScript(() => {
    window.storageAccess = [];
    for (const name of ["localStorage", "sessionStorage", "indexedDB"] as const) {
      const descriptor = Object.getOwnPropertyDescriptor(window, name) ?? Object.getOwnPropertyDescriptor(Window.prototype, name);
      const read = descriptor?.get;
      if (!read) continue;
      Object.defineProperty(window, name, {
        configurable: true,
        get() {
          window.storageAccess.push(name);
          return read.call(window);
        },
      });
    }
  });
  await resetAdmin({ factor: "none" });
  await signIn(page);
  await page.getByRole("button", { name: "Generar código QR" }).click();
  await enterCode(page, VALID_CODE, "Confirmar");
  await enterCode(page, VALID_CODE);
  for (const item of NAV_ITEMS) {
    await openMenu(page);
    await page.getByRole("navigation", { name: "Secciones" }).getByRole("link", { name: item.label, exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: item.label })).toBeVisible();
  }
  await openMenu(page);
  await page.getByRole("button", { name: "Salir" }).click();
  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();

  expect(await page.evaluate(() => window.storageAccess)).toEqual([]);
  const stored = await page.evaluate(async () => ({
    local: window.localStorage.length,
    session: window.sessionStorage.length,
    databases: (await window.indexedDB.databases()).length,
  }));
  expect(stored).toEqual({ local: 0, session: 0, databases: 0 });
});
