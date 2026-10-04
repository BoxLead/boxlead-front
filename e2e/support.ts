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

export async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}
