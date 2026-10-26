import { expect, expectAccessible, screenshot, test } from "./support.ts";
import { MOCK_API_ORIGIN } from "./ports.ts";

const PAGES = [
  { path: "/whatsapp", heading: "Un agente de IA que atiende tu WhatsApp Business las 24 horas" },
  { path: "/instagram", heading: "Mensajes directos y comentarios de Instagram, respondidos por tu agente" },
  { path: "/messenger", heading: "Los mensajes de tu página de Facebook, atendidos en automático" },
  { path: "/mercadolibre", heading: "Preguntas y postventa de MercadoLibre con respuesta inmediata" },
  { path: "/agencias", heading: "Sumá un agente de IA a cada cliente que atendés" },
];

for (const { path, heading } of PAGES) {
  test(`${path} is a public page with its own heading and no API calls`, async ({ page }) => {
    test.slow();
    const calls: string[] = [];
    page.on("request", (request) => {
      if (request.url().startsWith(MOCK_API_ORIGIN)) calls.push(request.url());
    });
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page).toHaveTitle(/· BoxLead$/);
    await expect(page.getByRole("navigation", { name: "Ubicación" }).getByRole("link", { name: "Inicio" })).toHaveAttribute("href", "/");
    await expect(page.getByRole("link", { name: "Empezar ahora" }).first()).toHaveAttribute("href", "/register");
    await page.locator(".landing-footer").scrollIntoViewIfNeeded();
    await expect(page.getByRole("contentinfo").getByRole("navigation", { name: "Canales" }).getByRole("link")).toHaveCount(5);
    await expectAccessible(page);
    await screenshot(page, `editorial${path.replace("/", "-")}`);
    expect(calls).toEqual([]);
  });
}

test("the landing links every channel page", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "WhatsApp" }).first()).toHaveAttribute("href", "/whatsapp");
  await page.getByRole("contentinfo").getByRole("navigation", { name: "Canales" }).getByRole("link", { name: "MercadoLibre" }).click();
  await expect(page).toHaveURL(/\/mercadolibre$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("MercadoLibre");
  await page.getByRole("contentinfo").getByRole("navigation", { name: "Producto" }).getByRole("link", { name: "Demo" }).click();
  await expect(page).toHaveURL(/\/#demo$/);
});
