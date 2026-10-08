import { expect, test, type Page } from "@playwright/test";
import { expectAccessible, login, resetApi, screenshot } from "./support.ts";

const NOW = new Date("2026-10-07T15:00:00");

const tabs = (page: Page) => page.getByRole("tablist", { name: "Indicadores" }).getByRole("tab");
const tab = (page: Page, name: string) => page.getByRole("tablist", { name: "Indicadores" }).getByRole("tab", { name: new RegExp(`^${name}`) });
const breakdown = (page: Page) => page.getByRole("region", { name: "Desglose" });
const rows = (page: Page) => breakdown(page).locator("tbody tr");
const readout = (page: Page) => page.locator(".metric-chart-readout");

async function openMetrics(page: Page, path = "/app/metrics") {
  await page.clock.setFixedTime(NOW);
  await login(page, path);
  await expect(tabs(page)).toHaveCount(5);
}

test.beforeEach(async () => {
  await resetApi();
});

test("shows the period at a glance", async ({ page }) => {
  await openMetrics(page);
  await expect(page.getByRole("heading", { level: 1, name: "Métricas" })).toBeVisible();
  await expect(page.getByText("Datos de ejemplo", { exact: true })).toBeVisible();
  await expect(page.getByText("8 sept al 7 oct")).toBeVisible();
  await expect(page.getByRole("region", { name: "Señales" }).locator("li")).toHaveCount(3);
  await expect(tab(page, "Leads")).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("img", { name: /Leads por día/ })).toBeVisible();
  await expect(page.getByText("Próximos 14 días")).toBeVisible();
  await expect(rows(page)).toHaveCount(4);
  for (const title of ["Embudo", "Cuándo te escriben", "Atención"]) {
    await expect(page.getByRole("heading", { level: 2, name: title })).toBeVisible();
  }
  await expectAccessible(page);
  await screenshot(page, "metrics");
});

test("each indicator drives the chart", async ({ page }) => {
  await openMetrics(page);
  await tab(page, "Ventas").click();
  await expect(page).toHaveURL(/metric=sales/);
  await expect(tab(page, "Ventas")).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("img", { name: /Ventas por día/ })).toBeVisible();
  await expect(breakdown(page).locator("thead th.breakdown-focus")).toHaveText("Ventas");

  await page.keyboard.press("ArrowRight");
  await expect(tab(page, "Ingresos")).toBeFocused();
  await expect(page).toHaveURL(/metric=revenue/);
  await page.keyboard.press("Home");
  await expect(page).not.toHaveURL(/metric=/);

  await tab(page, "Calificación").click();
  await expect(page.getByText("Próximos 14 días")).toHaveCount(0);
  await page.reload();
  await expect(tab(page, "Calificación")).toHaveAttribute("aria-selected", "true");
});

test("filters from the header and from the breakdown", async ({ page }) => {
  await openMetrics(page);
  await page.getByRole("group", { name: "Período" }).getByRole("button", { name: "7 días" }).click();
  await expect(page).toHaveURL(/period=7/);
  await expect(page.getByText("1 oct al 7 oct")).toBeVisible();

  const whatsapp = breakdown(page).getByRole("button", { name: "WhatsApp" });
  await whatsapp.click();
  await expect(page).toHaveURL(/channel=WHATSAPP/);
  await expect(whatsapp).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Canal")).toHaveValue("WHATSAPP");
  await expect(rows(page)).toHaveCount(4);
  await whatsapp.click();
  await expect(page).not.toHaveURL(/channel=/);

  await breakdown(page).getByRole("group", { name: "Agrupar por" }).getByRole("button", { name: "Categoría" }).click();
  await breakdown(page).getByRole("button", { name: "Presupuesto" }).click();
  await expect(page).toHaveURL(/category=/);
  await expect(page.getByLabel("Categoría")).not.toHaveValue("");
  await page.getByRole("button", { name: "Limpiar" }).click();
  await expect(page).not.toHaveURL(/category=/);
});

test("unknown parameters fall back to the defaults", async ({ page }) => {
  await openMetrics(page, "/app/metrics?period=12&channel=FAX&metric=nada");
  await expect(page.getByRole("group", { name: "Período" }).getByRole("button", { name: "30 días" })).toHaveAttribute("aria-pressed", "true");
  await expect(tab(page, "Leads")).toHaveAttribute("aria-selected", "true");
  await expect(page.getByLabel("Canal")).toHaveValue("ALL");
});

test("the chart and the hours map read under the pointer and the keyboard", async ({ page }) => {
  await openMetrics(page);
  await expect(readout(page)).toContainText("martes, 6 de octubre");
  const chart = page.getByRole("img", { name: /Leads por día/ });
  await chart.scrollIntoViewIfNeeded();
  const box = await chart.boundingBox();
  if (!box) throw new Error("chart not rendered");
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.5);
  await expect(readout(page)).not.toContainText("6 de octubre");
  await expect(readout(page)).toContainText("Anterior");

  await chart.focus();
  await page.keyboard.press("End");
  await expect(readout(page)).toContainText("estimado");
  await expect(readout(page)).toContainText("Entre");

  const hours = page.locator(".hours-readout");
  await expect(hours).toContainText("Pico");
  await page.locator(".hours-cell").nth(24 + 20).hover();
  await expect(hours).toContainText("Martes 20 h");
});

test("the assumptions change the revenue", async ({ page }) => {
  await openMetrics(page);
  const before = await tab(page, "Ingresos").locator(".performance-tab-value").innerText();
  await page.getByRole("button", { name: "Supuestos" }).click();
  const dialog = page.getByRole("dialog", { name: "Supuestos de las estimaciones" });
  await dialog.getByLabel(/Ticket promedio/).fill("100000");
  await dialog.getByLabel("Minutos por respuesta manual").fill("0");
  await expect(dialog.getByRole("button", { name: "Guardar" })).toBeDisabled();
  await dialog.getByLabel("Minutos por respuesta manual").fill("6");
  await expectAccessible(page);
  await screenshot(page, "metrics-settings");
  await dialog.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Guardamos los supuestos" })).toBeVisible();
  await expect(tab(page, "Ingresos").locator(".performance-tab-value")).not.toHaveText(before);

  await page.getByRole("button", { name: "Supuestos" }).click();
  await dialog.getByLabel(/Ticket promedio/).fill("");
  await dialog.getByRole("button", { name: "Guardar" }).click();
  await tab(page, "Ingresos").click();
  await expect(tab(page, "Ingresos").locator(".performance-tab-value")).toHaveText("—");
  await expect(page.getByRole("button", { name: "Cargar ticket" })).toBeVisible();
});

test("signals link to the leads behind them", async ({ page }) => {
  await openMetrics(page);
  const link = page.getByRole("region", { name: "Señales" }).getByRole("link").first();
  const href = await link.getAttribute("href");
  await link.click();
  await expect(page).toHaveURL(new RegExp(`${(href ?? "").replace(/[?]/g, "\\?")}$`));
});

test("the sidebar opens the metrics", async ({ page }) => {
  await page.clock.setFixedTime(NOW);
  await login(page);
  await page.getByRole("link", { name: "Métricas" }).click();
  await expect(page).toHaveURL(/\/app\/metrics$/);
  await expect(page).toHaveTitle(/Métricas/);
});
