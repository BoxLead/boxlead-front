import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AgentResponse } from "../api/types";
import { AGENTS_KEY, createAgent, deleteAgent, saveBusinessProfile, setAgentEnabled, BUSINESS_PROFILE_KEY } from "./agents";
import { clearQueryCache, getQueryState, setQueryData } from "./queryCache";

const fetchMock = vi.fn<typeof fetch>();

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const agent = (patch: Partial<AgentResponse> = {}): AgentResponse => ({
  id: "a-1",
  name: "Ventas",
  instructions: "",
  enabled: true,
  position: 0,
  scopes: [{ id: "s-1", platform: null, categoryId: null, salesStage: null, replyMode: "AUTO" }],
  createdAt: null,
  updatedAt: null,
  ...patch,
});

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("VITE_AGENT_API_BASE_URL", "https://agent.example.com");
  clearQueryCache();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("agent mutations", () => {
  it("shows the new state at once and keeps what the server answers", async () => {
    setQueryData<AgentResponse[]>(AGENTS_KEY, () => [agent()]);
    fetchMock.mockImplementation(() => {
      expect(getQueryState<AgentResponse[]>(AGENTS_KEY).data?.[0].enabled).toBe(false);
      return Promise.resolve(json(agent({ enabled: false, updatedAt: "now" })));
    });

    await setAgentEnabled(agent(), false);

    expect(getQueryState<AgentResponse[]>(AGENTS_KEY).data?.[0]).toMatchObject({ enabled: false, updatedAt: "now" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://agent.example.com/agents/a-1");
    expect(JSON.parse(String(init?.body))).toEqual({
      name: "Ventas",
      instructions: "",
      enabled: false,
      scopes: [{ platform: null, categoryId: null, salesStage: null, replyMode: "AUTO" }],
    });
  });

  it("puts the previous state back when the server refuses", async () => {
    setQueryData<AgentResponse[]>(AGENTS_KEY, () => [agent()]);
    fetchMock.mockResolvedValue(json({ error: "x", message: "Validation failed" }, 422));

    await expect(setAgentEnabled(agent(), false)).rejects.toMatchObject({ status: 422 });

    expect(getQueryState<AgentResponse[]>(AGENTS_KEY).data?.[0].enabled).toBe(true);
  });

  it("adds a created agent and drops a deleted one", async () => {
    setQueryData<AgentResponse[]>(AGENTS_KEY, () => [agent()]);
    fetchMock.mockResolvedValueOnce(json(agent({ id: "a-2", name: "Postventa", position: 1 }), 201));

    await createAgent({ name: "Postventa", instructions: "", enabled: true, scopes: agent().scopes });
    expect(getQueryState<AgentResponse[]>(AGENTS_KEY).data?.map((item) => item.id)).toEqual(["a-1", "a-2"]);

    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await deleteAgent("a-1");
    expect(getQueryState<AgentResponse[]>(AGENTS_KEY).data?.map((item) => item.id)).toEqual(["a-2"]);
  });

  it("keeps the saved business profile in the cache", async () => {
    const saved = { description: "Vendemos audio", tone: null, autoCategorize: false };
    fetchMock.mockResolvedValue(json(saved));

    await saveBusinessProfile(saved);

    expect(getQueryState(BUSINESS_PROFILE_KEY).data).toEqual(saved);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "PUT" });
  });
});
