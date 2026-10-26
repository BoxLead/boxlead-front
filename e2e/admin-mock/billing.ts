import { page, type MockArea } from "./http.ts";

export const billing: MockArea = {
  routes: [
    { method: "GET", pattern: /^\/admin\/subscriptions$/, access: "ANY", handle: ({ query }) => page([], query, 50) },
    { method: "GET", pattern: /^\/admin\/payments$/, access: "ANY", handle: ({ query }) => page([], query, 50) },
    { method: "GET", pattern: /^\/admin\/refunds$/, access: ["FINANCE"], handle: ({ query }) => page([], query, 50) },
    { method: "GET", pattern: /^\/admin\/invoices$/, access: ["FINANCE"], handle: ({ query }) => page([], query, 50) },
  ],
};
