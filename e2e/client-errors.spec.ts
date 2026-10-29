import type { Page } from "@playwright/test";
import type { ClientErrorReport } from "./mock-api/clientErrors.ts";
import { expect, login, mockApiUrl, resetApi, test } from "./support.ts";

const LEAD_PATH = "/app/leads/00000000-0000-4000-8000-000000000000?status=NEW#top";
const RAW = "No lead for ana.perez@negocio.com order 2000012345 token 9f86d081884c7d659a2feaa0c55ad015 at https://api.boxlead.app/leads?email=ana%40negocio.com";
const CLEAN = "No lead for [email] order [number] token [token] at https://api.boxlead.app/leads";

test.skip(({ viewport }) => (viewport?.width ?? 0) < 400, "Error reporting does not depend on the viewport");

async function received(): Promise<ClientErrorReport[]> {
  const res = await fetch(`${mockApiUrl()}/__client-errors`);
  return (await res.json()) as ClientErrorReport[];
}

async function openLead(page: Page) {
  await login(page, LEAD_PATH);
  await expect(page.getByText("No encontramos este lead")).toBeVisible();
}

async function rejectInPage(page: Page, message: string) {
  await page.evaluate((text) => {
    void Promise.reject(new Error(text));
  }, message);
}

async function throwInPage(page: Page, message: string) {
  await page.evaluate((text) => {
    setTimeout(() => {
      throw new TypeError(text);
    });
  }, message);
}

test("with the flag on a page error reaches core sanitized and only once", async ({ page }) => {
  await resetApi("default", undefined, { clientErrors: true });
  await openLead(page);

  await rejectInPage(page, RAW);
  await rejectInPage(page, RAW);
  await throwInPage(page, "Cannot read properties of undefined (reading 'preview')");

  await expect.poll(async () => (await received()).length).toBe(2);
  const reports = await received();
  expect(reports[0]).toMatchObject({ kind: "unhandledrejection", message: CLEAN, route: "/app/leads/:id" });
  expect(reports[0].release).toMatch(/^[\w.+-]{1,64}$/);
  expect(reports[1]).toMatchObject({
    kind: "error",
    message: "TypeError: Cannot read properties of undefined (reading 'preview')",
    route: "/app/leads/:id",
  });
  expect(JSON.stringify(reports)).not.toMatch(/negocio\.com|2000012345|status=NEW/);
});

test("with the flag off nothing is sent", async ({ page }) => {
  await resetApi("default");
  const sent: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/client-errors")) sent.push(request.url());
  });
  await openLead(page);

  await rejectInPage(page, RAW);
  await throwInPage(page, "Cannot read properties of undefined (reading 'preview')");
  await page.getByRole("link", { name: "Leads", exact: true }).first().click();
  await expect(page).toHaveURL(/\/app\/leads$/);

  expect(sent).toEqual([]);
  expect(await received()).toEqual([]);
});

test("before login nothing is sent", async ({ page }) => {
  await resetApi("default", undefined, { clientErrors: true });
  const sent: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/client-errors")) sent.push(request.url());
  });
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Ingresar" })).toBeVisible();

  await rejectInPage(page, RAW);
  await page.getByLabel("Email").fill("demo@boxlead.app");

  expect(sent).toEqual([]);
  expect(await received()).toEqual([]);
});
