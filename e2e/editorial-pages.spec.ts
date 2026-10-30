import type { Locator } from "@playwright/test";
import { expect, expectAccessible, screenshot, test } from "./support.ts";
import { MOCK_API_ORIGIN } from "./ports.ts";

function hiddenText(section: Locator): Promise<string[]> {
  return section.evaluate((root) => {
    const hidden: string[] = [];
    for (const node of root.querySelectorAll<HTMLElement>("h1, h2, h3, p, li, summary, a")) {
      const text = node.innerText.trim();
      if (!text || node.closest("[aria-hidden='true']")) continue;
      let opacity = 1;
      let clipped = false;
      for (let current: HTMLElement | null = node; current && current !== root.parentElement; current = current.parentElement) {
        const style = getComputedStyle(current);
        opacity *= Number(style.opacity);
        if (style.clipPath.includes("100%")) clipped = true;
      }
      if (opacity < 0.99 || clipped) hidden.push(text.slice(0, 60));
    }
    return hidden;
  });
}

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

for (const { path } of PAGES) {
  test(`${path} shows every section once it scrolls into view`, async ({ page }) => {
    test.slow();
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const sections = page.locator("main > section");
    const count = await sections.count();
    expect(count).toBeGreaterThanOrEqual(5);
    for (let index = 0; index < count; index += 1) {
      const section = sections.nth(index);
      const box = await section.evaluate((node) => {
        const rect = node.getBoundingClientRect();
        return { top: rect.top + window.scrollY, height: rect.height };
      });
      const viewport = page.viewportSize()?.height ?? 600;
      for (let top = box.top; top < box.top + box.height; top += viewport / 2) {
        await page.evaluate((y) => window.scrollTo(0, y), top);
        await page.waitForTimeout(50);
      }
      await expect.poll(() => hiddenText(section), { message: `hidden text in section ${index} of ${path}` }).toEqual([]);
    }
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
