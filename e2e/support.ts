import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";
import type { Scenario } from "./mock-api/fixtures.ts";

export const MOCK_API = "http://localhost:8090";
export const DEMO_EMAIL = "demo@boxlead.app";
export const DEMO_PASSWORD = "demo1234";

export async function resetApi(scenario: Scenario = "default") {
  const res = await fetch(`${MOCK_API}/__reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Requested-With": "boxlead-web" },
    body: JSON.stringify({ scenario }),
  });
  expect(res.ok).toBe(true);
}

export async function login(page: Page, path = "/app/inbox") {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(DEMO_EMAIL);
  await page.locator('input[name="password"]').fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL("**/app/inbox");
  if (path !== "/app/inbox") await page.goto(path);
}

async function waitForEnterAnimations(page: Page) {
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((animation) => Number.isFinite(animation.effect?.getComputedTiming().endTime))
        .map((animation) => animation.finished),
    ),
  );
}

export async function expectAccessible(page: Page) {
  await waitForEnterAnimations(page);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

export async function screenshot(page: Page, name: string) {
  const dir = process.env.SCREENSHOT_DIR;
  if (!dir) return;
  const width = page.viewportSize()?.width ?? 0;
  await page.screenshot({ path: `${dir}/${name}-${width}.png`, fullPage: true, animations: "disabled" });
}

export async function routeOAuthProvider(
  page: Page,
  host: string,
  respond: (authorizeUrl: URL) => Record<string, string>,
) {
  await page.route(`https://${host}/**`, async (route) => {
    const authorizeUrl = new URL(route.request().url());
    const redirect = new URL(authorizeUrl.searchParams.get("redirect_uri") ?? "");
    for (const [key, value] of Object.entries(respond(authorizeUrl))) {
      redirect.searchParams.set(key, value);
    }
    await route.fulfill({ status: 302, headers: { location: redirect.toString() } });
  });
}
