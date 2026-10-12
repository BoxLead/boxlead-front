import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/client";
import { runPlayground, type PlaygroundRun } from "./agentPlayground";

const fetchMock = vi.fn<typeof fetch>();

const RULES = {
  channelName: "WhatsApp",
  maxLength: 2000,
  audience: "PRIVATE",
  singleReply: false,
  contactDetailsAllowed: true,
  guidelines: [],
};

function sse(events: object[]): Response {
  const body = events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("");
  return new Response(body, { status: 200, headers: { "Content-Type": "text/event-stream" } });
}

function replyEvents(reply: string): object[] {
  return [
    { type: "RUN_STARTED", threadId: "t", runId: "r" },
    { type: "TEXT_MESSAGE_START", messageId: "m-1", role: "assistant" },
    { type: "TEXT_MESSAGE_CONTENT", messageId: "m-1", delta: reply },
    { type: "TEXT_MESSAGE_END", messageId: "m-1" },
    {
      type: "STATE_SNAPSHOT",
      snapshot: { decision: "REPLY", reason: null, replyMode: "DRAFT", channelRules: RULES, violations: [] },
    },
    { type: "RUN_FINISHED", threadId: "t", runId: "r" },
  ];
}

const run: PlaygroundRun = {
  target: { agentId: "a-1" },
  scenario: { platform: "WHATSAPP", salesStage: "PRE_SALE", categoryId: "c-1" },
  history: [{ role: "user", content: "¿Hay stock?" }],
};

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("VITE_AGENT_API_BASE_URL", "https://agent.example.com");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("runPlayground", () => {
  it("posts a standard AG-UI input with the test chat and the scenario", async () => {
    fetchMock.mockResolvedValue(sse(replyEvents("Sí, hay stock.")));

    await runPlayground(run);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://agent.example.com/agents/playground");
    expect(init).toMatchObject({ method: "POST", credentials: "include" });
    expect(init?.headers).toMatchObject({ "X-Requested-With": "boxlead-web" });
    const input = JSON.parse(String(init?.body)) as Record<string, unknown>;
    expect(input.messages).toEqual([expect.objectContaining({ role: "user", content: "¿Hay stock?" })]);
    expect(input.state).toEqual({
      agentId: "a-1",
      platform: "WHATSAPP",
      salesStage: "PRE_SALE",
      categoryId: "c-1",
    });
  });

  it("sends an unsaved agent instead of an id", async () => {
    fetchMock.mockResolvedValue(sse(replyEvents("Hola")));

    await runPlayground({ ...run, target: { agent: { name: "Nuevo", instructions: "Sé breve" } } });

    const input = JSON.parse(String(fetchMock.mock.calls[0][1]?.body)) as { state: Record<string, unknown> };
    expect(input.state).toMatchObject({ agent: { name: "Nuevo", instructions: "Sé breve" } });
    expect(input.state).not.toHaveProperty("agentId");
  });

  it("collects the streamed reply and the final decision", async () => {
    fetchMock.mockResolvedValue(sse(replyEvents("Sí, hay stock.")));
    const onReplyDelta = vi.fn();

    const outcome = await runPlayground({ ...run, onReplyDelta });

    expect(outcome.reply).toBe("Sí, hay stock.");
    expect(onReplyDelta).toHaveBeenCalledWith("Sí, hay stock.");
    expect(outcome.result).toMatchObject({ decision: "REPLY", replyMode: "DRAFT" });
    expect(outcome.result?.channelRules.channelName).toBe("WhatsApp");
  });

  it("returns a handoff without any reply", async () => {
    fetchMock.mockResolvedValue(
      sse([
        { type: "RUN_STARTED", threadId: "t", runId: "r" },
        {
          type: "STATE_SNAPSHOT",
          snapshot: { decision: "HANDOFF", reason: "Pidió una persona", replyMode: null, channelRules: RULES, violations: [] },
        },
        { type: "RUN_FINISHED", threadId: "t", runId: "r" },
      ]),
    );

    const outcome = await runPlayground(run);

    expect(outcome.reply).toBe("");
    expect(outcome.result).toMatchObject({ decision: "HANDOFF", reason: "Pidió una persona" });
  });

  it("ignores a snapshot that is not a playground result", async () => {
    fetchMock.mockResolvedValue(
      sse([
        { type: "RUN_STARTED", threadId: "t", runId: "r" },
        { type: "STATE_SNAPSHOT", snapshot: { something: "else" } },
        { type: "RUN_FINISHED", threadId: "t", runId: "r" },
      ]),
    );

    expect((await runPlayground(run)).result).toBeNull();
  });

  it("turns an HTTP error into an ApiError with the server message", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "Too many", message: "Too many test runs" }), { status: 429 }),
    );

    await expect(runPlayground(run)).rejects.toMatchObject({ status: 429, message: "Too many test runs" });
  });

  it("does not return a reply once the run has been aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    fetchMock.mockResolvedValue(sse(replyEvents("tarde")));

    const failure = await runPlayground({ ...run, signal: controller.signal }).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ApiError);
  });

  it("fails with a safe message when the run reports an error", async () => {
    fetchMock.mockResolvedValue(
      sse([
        { type: "RUN_STARTED", threadId: "t", runId: "r" },
        { type: "RUN_ERROR", message: "internal detail", code: "RUN_FAILED" },
      ]),
    );

    const failure = await runPlayground(run).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ApiError);
    expect((failure as ApiError).message).toBe("No pudimos completar la prueba. Probá de nuevo.");
  });
});
