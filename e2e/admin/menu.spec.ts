import type { AdminRole } from "../../admin/src/api/types.ts";
import { NAV_ITEMS } from "../../admin/src/nav.ts";
import { enterAdmin, expect, expectAccessible, horizontalOverflow, navLinks, openMenu, resetAdmin, test } from "./support.ts";

const ALL = NAV_ITEMS.map((item) => item.label);

const VISIBLE: Record<AdminRole, string[]> = {
  OWNER: ALL,
  FINANCE: ALL.filter((label) => !["Invitaciones y Demo", "Equipo", "Auditoría"].includes(label)),
  SUPPORT: ALL.filter((label) => !["Reembolsos", "Facturas", "Comisiones", "Liquidaciones", "Equipo", "Auditoría"].includes(label)),
};

for (const role of ["OWNER", "FINANCE", "SUPPORT"] as const) {
  test(`shows the menu of ${role}`, async ({ page }) => {
    await resetAdmin({ roles: [role] });
    await enterAdmin(page);
    expect(await navLinks(page)).toEqual(VISIBLE[role]);
  });
}

test("adds up the screens of two roles", async ({ page }) => {
  await resetAdmin({ roles: ["FINANCE", "SUPPORT"] });
  await enterAdmin(page);
  expect(await navLinks(page)).toEqual(ALL.filter((label) => !["Equipo", "Auditoría"].includes(label)));
});

test("hides a screen the role can not see even from its address", async ({ page }) => {
  await resetAdmin({ roles: ["SUPPORT"] });
  await enterAdmin(page, "/facturas");
  await expect(page.getByRole("heading", { level: 1, name: "Sin permiso" })).toBeVisible();
  await expect(page.getByText("Tu rol no ve esta pantalla")).toBeVisible();
});

test("every screen has its heading, its empty state and no sideways scroll", async ({ page }) => {
  test.setTimeout(60_000);
  await resetAdmin();
  await enterAdmin(page);
  for (const item of NAV_ITEMS) {
    await openMenu(page);
    await page.getByRole("navigation", { name: "Secciones" }).getByRole("link", { name: item.label, exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: item.label })).toBeVisible();
    await expect(page.locator(".screen .panel").first()).toBeVisible();
    await expect(page).toHaveTitle(`${item.label} · Backoffice de BoxLead`);
    expect(await horizontalOverflow(page), item.path).toBeLessThanOrEqual(0);
  }
  await expectAccessible(page);
});

test("detail screens and unknown addresses render inside the layout", async ({ page }) => {
  await resetAdmin();
  await enterAdmin(page, "/usuarios/0b0e0000-0000-4000-8000-000000000001");
  await expect(page.getByRole("heading", { level: 1, name: "Detalle de usuario" })).toBeVisible();
  await page.locator(".screen-back").click();
  await expect(page.getByRole("heading", { level: 1, name: "Usuarios" })).toBeVisible();
  await page.goto("/no-existe");
  await expect(page.getByRole("heading", { level: 1, name: "No encontramos esta pantalla" })).toBeVisible();
});
