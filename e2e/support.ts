import AxeBuilder from "@axe-core/playwright";
import { expect, test as base, type Page } from "@playwright/test";
import type { Scenario } from "./mock-api/fixtures.ts";
import { MOCK_API_ORIGIN, mockApiPortOf } from "./ports.ts";

export { expect };

export const DEMO_EMAIL = "demo@boxlead.app";
export const DEMO_PASSWORD = "demo1234";

const CSRF_HEADERS = { "Content-Type": "application/json", "X-Requested-With": "boxlead-web" };

export function mockApiUrl(): string {
  return `http://localhost:${mockApiPortOf(base.info().parallelIndex)}`;
}

export const test = base.extend({
  context: async ({ context }, provide, testInfo) => {
    const workerApi = `http://localhost:${mockApiPortOf(testInfo.parallelIndex)}`;
    if (workerApi !== MOCK_API_ORIGIN) {
      await context.route(`${MOCK_API_ORIGIN}/**`, (route) => {
        const url = route.request().url().replace(MOCK_API_ORIGIN, workerApi);
        return route.continue({ url }).catch(() => undefined);
      });
    }
    await provide(context);
  },
});

export async function resetApi(scenario: Scenario = "default") {
  const res = await fetch(`${mockApiUrl()}/__reset`, {
    method: "POST",
    headers: CSRF_HEADERS,
    body: JSON.stringify({ scenario }),
  });
  expect(res.ok).toBe(true);
}

export async function login(page: Page, path = "/app/inbox") {
  const session = await page.context().request.post(`${mockApiUrl()}/auth/login`, {
    headers: CSRF_HEADERS,
    data: { email: DEMO_EMAIL, password: DEMO_PASSWORD },
  });
  expect(session.ok()).toBe(true);
  await page.goto(path);
}

export async function loginThroughForm(page: Page) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(DEMO_EMAIL);
  await page.locator('input[name="password"]').fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL("**/app/inbox");
}

async function waitForEnterAnimations(page: Page) {
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((animation) => Number.isFinite(animation.effect?.getComputedTiming().endTime))
        .map((animation) => animation.finished.catch(() => undefined)),
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

export const AUTH0_HOST = "auth0.test";
export const AUTH0_CLIENT_ID = "e2e-client";

type IdentityClaims = { sub: string; email: string; email_verified: boolean; name: string };

export type FakeAuth0 = { connections: string[] };

function base64Url(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function idToken(claims: IdentityClaims, nonce: string): string {
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = base64Url({ alg: "RS256", typ: "JWT" });
  const payload = base64Url({
    ...claims,
    iss: `https://${AUTH0_HOST}/`,
    aud: AUTH0_CLIENT_ID,
    iat: issuedAt,
    exp: issuedAt + 600,
    nonce,
  });
  return `${header}.${payload}.signature`;
}

export async function routeAuth0(
  page: Page,
  outcome: { claims: IdentityClaims } | { error: string },
): Promise<FakeAuth0> {
  const fake: FakeAuth0 = { connections: [] };
  let nonce = "";
  await page.route(`https://${AUTH0_HOST}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const cors = {
      "access-control-allow-origin": request.headers().origin ?? "*",
      "access-control-allow-headers": "*",
      "access-control-allow-methods": "POST, OPTIONS",
    };
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: cors });
      return;
    }
    if (url.pathname === "/authorize") {
      fake.connections.push(url.searchParams.get("connection") ?? "");
      nonce = url.searchParams.get("nonce") ?? "";
      const redirect = new URL(url.searchParams.get("redirect_uri") ?? "");
      redirect.searchParams.set("state", url.searchParams.get("state") ?? "");
      if ("error" in outcome) {
        redirect.searchParams.set("error", outcome.error);
      } else {
        redirect.searchParams.set("code", "provider-code");
      }
      await route.fulfill({ status: 302, headers: { location: redirect.toString() } });
      return;
    }
    if (url.pathname === "/oauth/token" && "claims" in outcome) {
      await route.fulfill({
        status: 200,
        headers: { ...cors, "content-type": "application/json" },
        body: JSON.stringify({
          access_token: "provider-access-token",
          id_token: idToken(outcome.claims, nonce),
          token_type: "Bearer",
          expires_in: 600,
        }),
      });
      return;
    }
    await route.fulfill({ status: 404, headers: cors });
  });
  return fake;
}

export const GOOGLE_IDENTITY: IdentityClaims = {
  sub: "google-oauth2|1",
  email: "ana.social@example.com",
  email_verified: true,
  name: "Ana Social",
};
