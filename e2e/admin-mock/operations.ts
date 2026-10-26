import { ok, page, pageNumber, type MockArea } from "./http.ts";

export const operations: MockArea = {
  routes: [
    { method: "GET", pattern: /^\/admin\/usage$/, access: "ANY", handle: ({ query }) => page([], query, 100) },
    {
      method: "GET",
      pattern: /^\/admin\/usage\/summary$/,
      access: "ANY",
      handle: ({ query }) => ok({ items: [], page: pageNumber(query), size: 100, totalItems: 0, totals: [] }),
    },
    { method: "GET", pattern: /^\/admin\/consumer-requests$/, access: "ANY", handle: ({ query }) => page([], query, 50) },
    { method: "GET", pattern: /^\/admin\/grants$/, access: ["OWNER"], handle: ({ query }) => page([], query, 50) },
    { method: "GET", pattern: /^\/admin\/audit$/, access: ["OWNER"], handle: ({ query }) => page([], query, 100) },
  ],
};
