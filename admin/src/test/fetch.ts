import { vi } from "vitest";

export type Reply = { status: number; body?: unknown } | Error;

export function json(status: number, body?: unknown): Reply {
  return { status, body };
}

export function mockFetch(handler: (method: string, url: URL, body: unknown) => Reply) {
  const calls: { method: string; url: URL; init: RequestInit }[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(String(input));
    const method = init.method ?? "GET";
    calls.push({ method, url, init });
    const reply = handler(method, url, typeof init.body === "string" ? JSON.parse(init.body) : undefined);
    if (reply instanceof Error) throw reply;
    return new Response(reply.body === undefined ? null : JSON.stringify(reply.body), { status: reply.status });
  });
  vi.stubGlobal("fetch", fetchMock);
  return calls;
}
