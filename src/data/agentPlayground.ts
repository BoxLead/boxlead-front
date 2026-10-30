import i18next from "i18next";
import { agentApiUrl, ApiError, errorFromResponse, handleUnauthorized, REQUEST_HEADERS } from "../api/client";
import type { PlatformType, PlaygroundResult, SalesStage } from "../api/types";
import { readAgUiStream, type AgUiMessage, type AgUiRunInput } from "./agui";
import { refreshOnboarding } from "./onboarding";

export type PlaygroundTurn = { role: "user" | "assistant"; content: string };

export type PlaygroundTarget =
  | { agentId: string }
  | { agent: { name: string; instructions: string } };

export type PlaygroundScenario = {
  platform: PlatformType;
  salesStage: SalesStage;
  categoryId: string | null;
  comment?: boolean;
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

function fallbackError(): string {
  return i18next.t("errors.playgroundFailed", { ns: "agents" });
}

async function fetchWithSession(url: string, init: RequestInit): Promise<Response> {
  const response = await fetch(url, { ...init, credentials: "include" });
  if (response.ok) return response;
  if (response.status === 401) handleUnauthorized();
  throw await errorFromResponse(response);
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

function toMessages(history: PlaygroundTurn[]): AgUiMessage[] {
  return history.map((turn) => ({ id: crypto.randomUUID(), role: turn.role, content: turn.content }));
}

export function buildRunInput(run: PlaygroundRun): AgUiRunInput {
  return {
    threadId: crypto.randomUUID(),
    runId: crypto.randomUUID(),
    state: { ...run.target, ...run.scenario },
    messages: toMessages(run.history),
    tools: [],
    context: [],
    forwardedProps: {},
  };
}

export async function runPlayground(run: PlaygroundRun): Promise<PlaygroundOutcome> {
  const outcome: PlaygroundOutcome & { failed: boolean } = { reply: "", result: null, failed: false };

  try {
    const response = await fetchWithSession(agentApiUrl(PLAYGROUND_PATH), {
      method: "POST",
      headers: { ...REQUEST_HEADERS, "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify(buildRunInput(run)),
      signal: run.signal,
    });
    await readAgUiStream(
      response,
      {
        onTextMessageContent: (delta) => {
          outcome.reply += delta;
          run.onReplyDelta?.(delta);
        },
        onStateSnapshot: (snapshot) => {
          if (isPlaygroundResult(snapshot)) outcome.result = snapshot;
        },
        onRunError: () => {
          outcome.failed = true;
        },
      },
      run.signal,
    );
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(fallbackError(), 0);
  } finally {
    refreshOnboarding();
  }

  if (run.signal?.aborted || outcome.failed) throw new ApiError(fallbackError(), 0);
  return { reply: outcome.reply, result: outcome.result };
}
