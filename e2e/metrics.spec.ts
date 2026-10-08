import { expect, test, type Page } from "@playwright/test";
import { expectAccessible, login, resetApi, screenshot } from "./support.ts";

const NOW = new Date("2026-10-07T15:00:00");

const kpis = (page: Page) => page.getByRole("list", { name: "Indicadores principales" }).locator(":scope > li");
const kpi = (page: Page, label: string) => kpis(page).filter({ hasText: label });
const channelRows = (page: Page) => page.getByRole("region", { name: "Tabla de rendimiento por canal" }).locator("tbody tr");

async function openMetrics(page: Page, path = "/app/metrics") {
  await page.clock.setFixedTime(NOW);
  await login(page, path);
  await expect(kpis(page)).toHaveCount(5);
}

test.beforeEach(async () => {
  await resetApi();
});

test("shows what matters for the last 30 days", async ({ page }) => {
  await openMetrics(page);
  await expect(page.getByRole("heading", { level: 1, name: "Métricas" })).toBeVisible();
  await expect(page.getByText("Datos de ejemplo", { exact: true })).toBeVisible();
  await expect(page.getByText("Del 8 sept al 7 oct")).toBeVisible();
  await expect(page.getByRole("region", { name: "Lo que tenés que saber" }).locator("li")).toHaveCount(3);
  await expect(kpi(page, "Leads nuevos")).toContainText(/\d/);
  await expect(kpi(page, "Ingresos estimados")).toContainText("Con un ticket de");
  for (const title of [
    "Evolución de leads",
    "Embudo de conversión",
    "Leads por categoría",
    "Rendimiento por canal",
    "Velocidad de respuesta",
    "Agente de ventas",
    "¿Cuándo te escriben?",
  ]) {
    await expect(page.getByRole("heading", { level: 2, name: title })).toBeVisible();
  }
  await expect(page.getByRole("group", { name: "Estimación de los próximos 14 días" })).toContainText("Leads esperados");
  await expect(channelRows(page)).toHaveCount(4);
  await expect(page.getByRole("region", { name: "Leads por categoría" }).getByRole("link", { name: "Presupuesto" })).toBeVisible();
  await expectAccessible(page);
  await screenshot(page, "metrics");
});

test("filters by period, channel and category from the URL", async ({ page }) => {
  await openMetrics(page);
  await page.getByRole("group", { name: "Período" }).getByRole("button", { name: "7 días" }).click();
  await expect(page).toHaveURL(/period=7/);
  await expect(page.getByText("Del 1 oct al 7 oct")).toBeVisible();
  await expect(page.getByText("Comparado con la semana anterior")).toBeVisible();

  await page.getByRole("group", { name: "Canal" }).getByRole("button", { name: "WhatsApp" }).click();
  await expect(page).toHaveURL(/channel=WHATSAPP/);
  await expect(channelRows(page)).toHaveCount(1);
  await expect(channelRows(page)).toContainText("WhatsApp");

  await page.getByLabel("Filtrar por categoría").selectOption({ label: "Presupuesto" });
  await expect(page).toHaveURL(/category=/);
  const categories = page.getByRole("region", { name: "Leads por categoría" }).locator("li");
  await expect(categories).toHaveCount(1);
  await expect(categories).toContainText("Presupuesto");

  await page.reload();
  await expect(page.getByRole("group", { name: "Canal" }).getByRole("button", { name: "WhatsApp" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Filtrar por categoría")).toHaveValue(/.+/);
  await expect(categories).toHaveCount(1);
});

test("unknown filters fall back to the defaults", async ({ page }) => {
  await openMetrics(page, "/app/metrics?period=12&channel=FAX");
  await expect(page.getByRole("group", { name: "Período" }).getByRole("button", { name: "30 días" })).toHaveAttribute("aria-pressed", "true");
  await expect(channelRows(page)).toHaveCount(4);
});

test("pointing at the charts explains each bar and cell", async ({ page }) => {
  await openMetrics(page);
  const chart = page.getByRole("img", { name: /Leads por día y por canal/ });
  const readout = page.locator(".trend-readout");
  await chart.scrollIntoViewIfNeeded();
  const box = await chart.boundingBox();
  if (!box) throw new Error("chart not rendered");
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.5);
  await expect(readout).not.toContainText("hasta ahora");
  await expect(readout).toContainText("Período anterior");
  await page.mouse.move(box.x + box.width - 4, box.y + box.height * 0.5);
  await expect(readout).toContainText("estimación");

  const heatmap = page.locator(".heatmap-readout");
  await expect(heatmap).toContainText("Pico");
  await page.locator(".heatmap-cell").nth(24 + 20).hover();
  await expect(heatmap).toContainText("Martes de 20 a 21 h");
});

test("the trend chart can be read with the keyboard", async ({ page }) => {
  await openMetrics(page);
  const chart = page.getByRole("img", { name: /Leads por día y por canal/ });
  const readout = page.locator(".trend-readout");
  await expect(readout).toContainText("miércoles, 7 de octubre · hasta ahora");
  await chart.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(readout).toContainText("martes, 6 de octubre");
  await expect(readout).toContainText("Período anterior");
  await page.keyboard.press("End");
  await expect(readout).toContainText("estimación");
});

test("the assumptions change the estimates", async ({ page }) => {
  await openMetrics(page);
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
  await expect(kpi(page, "Ingresos estimados")).toContainText("Con un ticket de $ 100.000");
  await expect(page.getByText("Con 6 min por respuesta.")).toBeVisible();

  await page.getByRole("button", { name: "Supuestos" }).click();
  await dialog.getByLabel(/Ticket promedio/).fill("");
  await dialog.getByRole("button", { name: "Guardar" }).click();
  await expect(kpi(page, "Ingresos estimados")).toContainText("Cargá tu ticket promedio");
  await expect(page.getByRole("region", { name: "Tabla de rendimiento por canal" })).not.toContainText("Ingresos estimados");
});

test("insights link to the leads behind them", async ({ page }) => {
  await openMetrics(page);
  const link = page.getByRole("region", { name: "Lo que tenés que saber" }).getByRole("link").first();
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
