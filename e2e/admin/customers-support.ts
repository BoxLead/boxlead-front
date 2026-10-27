import type { Page } from "@playwright/test";
import type { AdminRole } from "../../admin/src/api/types.ts";
import { dayOf } from "../../admin/src/areas/customers/dates.ts";
import { CUSTOMERS_SCENARIO, RESELLERS } from "../admin-mock/customers.ts";
import { adminMockUrl, expect } from "./support.ts";

export async function resetCustomers(roles: AdminRole[] = ["OWNER"], scenario = CUSTOMERS_SCENARIO) {
  const res = await fetch(`${adminMockUrl()}/__reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Requested-With": "boxlead-web" },
    body: JSON.stringify({ roles, scenario }),
  });
  expect(res.ok).toBe(true);
}

export async function routeResellers(page: Page) {
  await page.route("**/admin/resellers*", (route) =>
    route.fulfill({
      json: {
        items: RESELLERS.map((reseller) => ({
          ...reseller,
          userId: null,
          status: "ACTIVE",
          rateBps: 2000,
          maxPaidCycles: 6,
          createdAt: "2026-01-01T12:00:00Z",
          codes: [],
        })),
        page: 0,
        size: 50,
        totalItems: RESELLERS.length,
      },
    }),
  );
}

export async function routeUsage(page: Page) {
  const day = dayOf(new Date());
  await page.route("**/admin/usage?*", (route) => {
    const userId = new URL(route.request().url()).searchParams.get("userId");
    return route.fulfill({
      json: {
        items: [
          {
            userId,
            day,
            agentId: null,
            model: "claude-sonnet-4-5",
            runs: 18,
            inputTokens: 1240,
            outputTokens: 860,
            cacheReadTokens: 0,
            cacheWriteTokens: 0,
            estimatedCostMicros: 21500,
            costCurrency: "USD",
            priceVersion: 1,
            computedAt: new Date().toISOString(),
          },
        ],
        page: 0,
        size: 100,
        totalItems: 1,
      },
    });
  });
}

export function section(page: Page, name: string) {
  return page.getByRole("region", { name, exact: true });
}
