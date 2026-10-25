import { describe, expect, it } from "vitest";
import { parseSseChunk, readAgUiStream } from "./agui";

function streamOf(parts: string[]): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      parts.forEach((part) => controller.enqueue(encoder.encode(part)));
      controller.close();
    },
  });
  return new Response(body, { headers: { "Content-Type": "text/event-stream" } });
}

describe("parseSseChunk", () => {
  it("parses complete events and keeps the unfinished tail", () => {
    const { events, rest } = parseSseChunk('data: {"type":"A"}\n\ndata: {"type":"B","delta":"x"}\n\ndata: {"ty');
    expect(events.map((event) => event.type)).toEqual(["A", "B"]);
    expect(rest).toBe('data: {"ty');
  });

  it("ignores comments, blank data and invalid JSON", () => {
    const { events } = parseSseChunk(': keep alive\n\ndata:\n\ndata: nope\n\nevent: x\ndata: {"type":"C"}\n\n');
    expect(events.map((event) => event.type)).toEqual(["C"]);
  });

  it("accepts CRLF line endings", () => {
    const { events } = parseSseChunk('data: {"type":"A"}\r\n\r\n');
    expect(events).toHaveLength(1);
  });
});

describe("readAgUiStream", () => {
  it("joins deltas that arrive split across chunks and reports the snapshot", async () => {
    const deltas: string[] = [];
    let snapshot: unknown = null;
    await readAgUiStream(
      streamOf([
        'data: {"type":"TEXT_MESSAGE_CONTENT","messageId":"m","delta":"Ho',
        'la"}\n\ndata: {"type":"TEXT_MESSAGE_CONTENT","messageId":"m","delta":" mundo"}\n\n',
        'data: {"type":"STATE_SNAPSHOT","snapshot":{"decision":"REPLY"}}\n\n',
      ]),
      { onTextMessageContent: (delta) => deltas.push(delta), onStateSnapshot: (value) => (snapshot = value) },
    );
    expect(deltas.join("")).toBe("Hola mundo");
    expect(snapshot).toEqual({ decision: "REPLY" });
  });

  it("reports run errors", async () => {
    let message: string | undefined;
    await readAgUiStream(streamOf(['data: {"type":"RUN_ERROR","message":"failed"}\n\n']), {
      onRunError: (value) => (message = value),
    });
    expect(message).toBe("failed");
  });

  it("stops reading when the run is aborted", async () => {
    const controller = new AbortController();
    const deltas: string[] = [];
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(stream) {
        stream.enqueue(encoder.encode('data: {"type":"TEXT_MESSAGE_CONTENT","delta":"a"}\n\n'));
        controller.abort();
        stream.enqueue(encoder.encode('data: {"type":"TEXT_MESSAGE_CONTENT","delta":"b"}\n\n'));
        stream.close();
      },
    });
    await readAgUiStream(new Response(body), { onTextMessageContent: (delta) => deltas.push(delta) }, controller.signal).catch(
      () => undefined,
    );
    expect(deltas).not.toContain("b");
  });
});
