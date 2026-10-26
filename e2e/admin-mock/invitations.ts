import { page, type MockArea } from "./http.ts";

export const invitations: MockArea = {
  routes: [
    { method: "GET", pattern: /^\/admin\/invitations$/, access: ["SUPPORT"], handle: ({ query }) => page([], query, 50) },
    { method: "GET", pattern: /^\/admin\/demo-grants$/, access: ["SUPPORT"], handle: ({ query }) => page([], query, 50) },
  ],
};
