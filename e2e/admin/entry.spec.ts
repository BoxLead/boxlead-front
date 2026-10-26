import { ADMIN_MOCK_ORIGIN } from "../ports.ts";
import {
  enterAdmin,
  enterCode,
  expect,
  expectAccessible,
  expireAdminSession,
  horizontalOverflow,
  INVALID_CODE,
  openMenu,
  resetAdmin,
  signIn,
  test,
  VALID_CODE,
} from "./support.ts";

test("signs in with password and code and lands on the screen it asked for", async ({ page }) => {
  await resetAdmin();
  await page.goto("/pagos");
  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expectAccessible(page);
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  await signIn(page, "/pagos");
  await expect(page.getByRole("heading", { name: "Código de verificación" })).toBeVisible();
  await expectAccessible(page);
  await enterCode(page, VALID_CODE);
  await expect(page.getByRole("heading", { level: 1, name: "Pagos" })).toBeVisible();
  await expect(page).toHaveURL(/\/pagos$/);
});

test("rejects a wrong password", async ({ page }) => {
  await resetAdmin();
  await page.goto("/");
  await page.getByLabel("Email").fill("equipo@boxlead.app");
  await page.getByLabel("Contraseña").fill("incorrecta");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText("El email o la contraseña no son correctos.");
});

test("enrolls a factor with a QR drawn in the page and then asks for a fresh code", async ({ page }) => {
  await resetAdmin({ factor: "none" });
  const external: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.hostname !== "localhost") external.push(request.url());
  });
  await signIn(page);
  await expect(page.getByRole("heading", { name: "Configurá tu segundo factor" })).toBeVisible();
  await page.getByRole("button", { name: "Generar código QR" }).click();
  const qr = page.getByRole("img", { name: "Código QR para tu app de autenticación" });
  await expect(qr).toBeVisible();
  expect(await qr.locator("path").getAttribute("d")).toMatch(/^M\d+ \d+h1v1h-1z/);
  await expect(page.locator(".entry-secret code")).toHaveText(/^[A-Z2-7]{16,}$/);
  await expectAccessible(page);
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);

  await enterCode(page, INVALID_CODE, "Confirmar");
  await expect(page.getByRole("alert")).toContainText("El código no es válido");
  await enterCode(page, VALID_CODE, "Confirmar");
  await expect(page.getByText("Tu factor quedó configurado")).toBeVisible();
  await enterCode(page, VALID_CODE);
  await expect(page.getByRole("heading", { level: 1, name: "Inicio" })).toBeVisible();
  expect(external).toEqual([]);
});

test("explains when the enrollment window already closed", async ({ page }) => {
  await resetAdmin({ factor: "none", enrollmentOpen: false });
  await signIn(page);
  await expect(page.getByRole("heading", { name: "Venció el plazo para configurar el factor" })).toBeVisible();
  await page.getByRole("button", { name: "Salir" }).click();
  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
});

test("rejects an invalid code and locks the factor after five", async ({ page }) => {
  await resetAdmin();
  await signIn(page);
  await expect(page.getByRole("heading", { name: "Código de verificación" })).toBeVisible();
  await enterCode(page, INVALID_CODE);
  await expect(page.getByRole("alert")).toContainText("El código no es válido");
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await enterCode(page, INVALID_CODE);
    await expect(page.getByRole("button", { name: "Abrir sesión" })).toBeVisible();
  }
  await expect(page.getByText("El factor está bloqueado")).toBeVisible();
  await expect(page.getByLabel("Código de 6 números")).toBeDisabled();
  await expect(page.getByRole("button", { name: "Abrir sesión" })).toBeDisabled();
});

test("shows a locked factor right away", async ({ page }) => {
  await resetAdmin({ locked: true });
  await signIn(page);
  await expect(page.getByText(/Podés probar de nuevo a las \d{2}:\d{2}/)).toBeVisible();
  await expect(page.getByLabel("Código de 6 números")).toBeDisabled();
});

test("asks for the code again when the admin session expired and keeps the screen", async ({ page }) => {
  await resetAdmin();
  await enterAdmin(page, "/usuarios");
  await expect(page.getByRole("heading", { level: 1, name: "Usuarios" })).toBeVisible();
  await expireAdminSession();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Código de verificación" })).toBeVisible();
  await enterCode(page, VALID_CODE);
  await expect(page.getByRole("heading", { level: 1, name: "Usuarios" })).toBeVisible();
});

test("tells an account without a role that it has no access", async ({ page }) => {
  await resetAdmin({ roles: [] });
  await signIn(page);
  await expect(page.getByRole("heading", { name: "Esta cuenta no tiene acceso" })).toBeVisible();
  await expect(page.getByText("Entraste como equipo@boxlead.app")).toBeVisible();
});

test("asks to reload when a request fails without an answer", async ({ page }) => {
  await resetAdmin();
  await enterAdmin(page);
  await page.route(`${ADMIN_MOCK_ORIGIN}/**`, (route) => route.abort("connectionrefused"));
  await page.reload();
  await expect(page.getByText("Se cortó la conexión con BoxLead")).toBeVisible();
  await expect(page.getByRole("button", { name: "Recargar" })).toBeVisible();
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
});

test("signs out of the admin session and of BoxLead", async ({ page }) => {
  await resetAdmin();
  await enterAdmin(page);
  await openMenu(page);
  await page.getByRole("button", { name: "Salir" }).click();
  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
});
