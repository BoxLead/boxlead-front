import { notFound, page, type MockArea } from "./http.ts";

export const referrals: MockArea = {
  routes: [
    { method: "GET", pattern: /^\/admin\/resellers$/, access: "ANY", handle: ({ query }) => page([], query, 50) },
    { method: "GET", pattern: /^\/admin\/resellers\/[^/]+$/, access: "ANY", handle: () => notFound() },
    { method: "GET", pattern: /^\/admin\/resellers\/[^/]+\/customers$/, access: "ANY", handle: () => notFound() },
    { method: "GET", pattern: /^\/admin\/commissions$/, access: ["FINANCE"], handle: ({ query }) => page([], query, 100) },
    { method: "GET", pattern: /^\/admin\/payouts$/, access: ["FINANCE"], handle: ({ query }) => page([], query, 100) },
    { method: "GET", pattern: /^\/admin\/payouts\/[^/]+$/, access: ["FINANCE"], handle: () => notFound() },
  ],
};
