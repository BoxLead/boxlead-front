import { HttpAgent, type Message } from "@ag-ui/client";
import { agentApiUrl, ApiError, handleUnauthorized, REQUEST_HEADERS } from "../api/client";
import type { PlatformType, PlaygroundResult, SalesStage } from "../api/types";

export type PlaygroundTurn = { role: "user" | "assistant"; content: string };

export type PlaygroundTarget =
  | { agentId: string }
  | { agent: { name: string; instructions: string } };

export type PlaygroundScenario = {
  platform: PlatformType;
  salesStage: SalesStage;
  categoryId: string | null;
};

export type PlaygroundRun = {
  target: PlaygroundTarget;
  scenario: PlaygroundScenario;
  history: PlaygroundTurn[];
  signal?: AbortSignal;
  onReplyDelta?: (delta: string) => void;
};

export type PlaygroundOutcome = {
  reply: string;
  result: PlaygroundResult | null;
};

const PLAYGROUND_PATH = "/agents/playground";
const FALLBACK_ERROR = "No pudimos completar la prueba. Probá de nuevo.";

async function fetchWithSession(url: string, init: RequestInit): Promise<Response> {
  const response = await fetch(url, { ...init, credentials: "include" });
  if (response.ok) return response;
  if (response.status === 401) handleUnauthorized();
  const text = await response.text();
  let message = `Request failed (${response.status})`;
  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed && typeof parsed === "object" && "message" in parsed && typeof parsed.message === "string") {
      message = parsed.message;
    }
  } catch {
    message = text || message;
  }
  throw new ApiError(message, response.status);
}

function isPlaygroundResult(value: unknown): value is PlaygroundResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "decision" in value &&
    (value.decision === "REPLY" || value.decision === "HANDOFF") &&
    "channelRules" in value &&
    typeof value.channelRules === "object"
  );
}

function toMessages(history: PlaygroundTurn[]): Message[] {
  return history.map((turn) => ({ id: crypto.randomUUID(), role: turn.role, content: turn.content }));
}

export async function runPlayground(run: PlaygroundRun): Promise<PlaygroundOutcome> {
  const agent = new HttpAgent({
    url: agentApiUrl(PLAYGROUND_PATH),
    headers: { ...REQUEST_HEADERS },
    fetch: fetchWithSession,
    threadId: crypto.randomUUID(),
    initialMessages: toMessages(run.history),
    initialState: { ...run.target, ...run.scenario },
  });
  run.signal?.addEventListener("abort", () => agent.abortRun(), { once: true });

  const outcome: PlaygroundOutcome & { failed: boolean } = { reply: "", result: null, failed: false };

  try {
    await agent.runAgent(
      {},
      {
        onTextMessageContentEvent: ({ event }) => {
          outcome.reply += event.delta;
          run.onReplyDelta?.(event.delta);
        },
        onStateSnapshotEvent: ({ event }) => {
          if (isPlaygroundResult(event.snapshot)) outcome.result = event.snapshot;
        },
        onRunErrorEvent: () => {
          outcome.failed = true;
        },
      },
    );
  } catch (error) {
    if (error instanceof ApiError || run.signal?.aborted) throw error;
    throw new ApiError(FALLBACK_ERROR, 0);
  }

  if (run.signal?.aborted || outcome.failed) throw new ApiError(FALLBACK_ERROR, 0);
  return { reply: outcome.reply, result: outcome.result };
}
