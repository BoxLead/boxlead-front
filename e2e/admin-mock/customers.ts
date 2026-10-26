import { hasRole, notFound, ok, page, type MockArea } from "./http.ts";

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export const customers: MockArea = {
  routes: [
    {
      method: "GET",
      pattern: /^\/admin\/overview$/,
      access: "ANY",
      handle: ({ query, admin }) => {
        const finance = hasRole(admin, "FINANCE");
        return ok({
          month: query.get("month") ?? currentMonth(),
          users: { total: 0, newInMonth: 0 },
          subscriptions: { byStatus: {}, byPlan: {} },
          demos: { active: 0 },
          payments: { approvedInMonth: 0, rejectedInMonth: 0 },
          revenue: finance ? [] : null,
          commissions: { approvedUnpaid: finance ? [] : null, accruedReleasable: finance ? [] : null },
        });
      },
    },
    { method: "GET", pattern: /^\/admin\/customers$/, access: "ANY", handle: ({ query }) => page([], query, 20) },
    { method: "GET", pattern: /^\/admin\/customers\/[^/]+$/, access: "ANY", handle: () => notFound() },
  ],
};
