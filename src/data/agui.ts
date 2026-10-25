export type AgUiMessage = { id: string; role: "user" | "assistant"; content: string };

export type AgUiRunInput = {
  threadId: string;
  runId: string;
  state: Record<string, unknown>;
  messages: AgUiMessage[];
  tools: never[];
  context: never[];
  forwardedProps: Record<string, never>;
};

export type AgUiEvent = { type: string } & Record<string, unknown>;

export type AgUiHandlers = {
  onTextMessageContent?: (delta: string) => void;
  onStateSnapshot?: (snapshot: unknown) => void;
  onRunError?: (message: string | undefined) => void;
};

export function parseSseChunk(buffer: string): { events: AgUiEvent[]; rest: string } {
  const events: AgUiEvent[] = [];
  const normalized = buffer.replace(/\r\n/g, "\n");
  const blocks = normalized.split("\n\n");
  const rest = blocks.pop() ?? "";
  for (const block of blocks) {
    const data = block
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).replace(/^ /, ""))
      .join("\n");
    if (!data) continue;
    try {
      const parsed: unknown = JSON.parse(data);
      if (parsed && typeof parsed === "object" && "type" in parsed && typeof parsed.type === "string") {
        events.push(parsed as AgUiEvent);
      }
    } catch {
      continue;
    }
  }
  return { events, rest };
}

function dispatch(event: AgUiEvent, handlers: AgUiHandlers): void {
  if (event.type === "TEXT_MESSAGE_CONTENT" && typeof event.delta === "string") {
    handlers.onTextMessageContent?.(event.delta);
  } else if (event.type === "STATE_SNAPSHOT") {
    handlers.onStateSnapshot?.(event.snapshot);
  } else if (event.type === "RUN_ERROR") {
    handlers.onRunError?.(typeof event.message === "string" ? event.message : undefined);
  }
}

export async function readAgUiStream(response: Response, handlers: AgUiHandlers, signal?: AbortSignal): Promise<void> {
  if (!response.body) {
    const { events } = parseSseChunk(`${await response.text()}\n\n`);
    events.forEach((event) => dispatch(event, handlers));
    return;
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const cancel = () => void reader.cancel().catch(() => undefined);
  if (signal?.aborted) {
    cancel();
    return;
  }
  signal?.addEventListener("abort", cancel, { once: true });
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done || signal?.aborted) break;
      buffer += decoder.decode(value, { stream: true });
      const parsed = parseSseChunk(buffer);
      buffer = parsed.rest;
      parsed.events.forEach((event) => dispatch(event, handlers));
    }
    const tail = parseSseChunk(`${buffer}${decoder.decode()}\n\n`);
    tail.events.forEach((event) => dispatch(event, handlers));
  } finally {
    signal?.removeEventListener("abort", cancel);
  }
}
