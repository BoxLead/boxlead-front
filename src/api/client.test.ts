import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { agentApi, agentApiUrl, api, apiUrl } from "./client";
import { clearQueryCache, fetchQuery, getQueryState } from "../data/queryCache";

const fetchMock = vi.fn<typeof fetch>();

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  clearQueryCache();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("API origins", () => {
  it("uses the dev proxies when no origin is configured", () => {
    vi.stubEnv("VITE_API_BASE_URL", "");
    vi.stubEnv("VITE_AGENT_API_BASE_URL", "");
    expect(apiUrl("/leads")).toBe("/api/leads");
    expect(agentApiUrl("/agents")).toBe("/agent-api/agents");
  });

  it("uses each configured origin without a trailing slash", () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com/");
    vi.stubEnv("VITE_AGENT_API_BASE_URL", "https://agent.example.com");
    expect(apiUrl("leads")).toBe("https://api.example.com/leads");
    expect(agentApiUrl("/agents")).toBe("https://agent.example.com/agents");
  });
});

describe("agentApi", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com");
    vi.stubEnv("VITE_AGENT_API_BASE_URL", "https://agent.example.com");
  });

  it("sends the session cookie and the CSRF header to the agent origin", async () => {
    fetchMock.mockResolvedValue(json({ id: "a-1" }));

    await agentApi.put("/agents/a-1", { name: "Ventas" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://agent.example.com/agents/a-1");
    expect(init).toMatchObject({ method: "PUT", credentials: "include" });
    expect(init?.headers).toMatchObject({ "X-Requested-With": "boxlead-web", "Content-Type": "application/json" });
    expect(init?.body).toBe(JSON.stringify({ name: "Ventas" }));
  });

  it("reads the message of an error response", async () => {
    fetchMock.mockResolvedValue(json({ error: "Agent not found", message: "Agent not found" }, 404));

    await expect(agentApi.get("/agents")).rejects.toMatchObject({ status: 404, message: "Agent not found" });
  });

  it("returns nothing for a 204", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(agentApi.delete("/agents/a-1")).resolves.toBeUndefined();
  });

  it("keeps core requests on the core origin", async () => {
    fetchMock.mockResolvedValue(json([]));

    await api.get("/categories");

    expect(fetchMock.mock.calls[0][0]).toBe("https://api.example.com/categories");
  });
});

describe("query cache origins", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com");
    vi.stubEnv("VITE_AGENT_API_BASE_URL", "https://agent.example.com");
  });

  it("loads prefixed keys from the agent service and plain keys from core", async () => {
    fetchMock.mockImplementation((url) => Promise.resolve(json({ from: String(url) })));

    await fetchQuery("agent:/agents");
    await fetchQuery("/agents");

    expect(getQueryState("agent:/agents").data).toEqual({ from: "https://agent.example.com/agents" });
    expect(getQueryState("/agents").data).toEqual({ from: "https://api.example.com/agents" });
  });
});
