import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../api/client";
import type { ConversationResponse, MessageResponse } from "../../api/types";
import { clearQueryCache, getQueryState, setQueryFetcher } from "../../data/queryCache";
import { useApiQuery } from "../../hooks/useApiQuery";
import { CONVERSATIONS_KEY, messagesKey, useConversationSender } from "./useConversationSender";

vi.mock("../../api/client", () => {
  class ApiError extends Error {
    readonly status: number;
    readonly body: unknown;

    constructor(message: string, status: number, body?: unknown) {
      super(message);
      this.name = "ApiError";
      this.status = status;
      this.body = body;
    }
  }

  return { ApiError, api: { post: vi.fn() } };
});

const conversation: ConversationResponse = {
  id: "c-1",
  leadId: "l-1",
  platform: "INSTAGRAM",
  externalThreadId: null,
  salesStage: "PRE_SALE",
  status: "OPEN",
  needsAttention: true,
  attentionReason: "El cliente pidió hablar con una persona.",
  createdAt: "2026-10-05T12:00:00.000Z",
  updatedAt: "2026-10-05T12:00:00.000Z",
};

const created: MessageResponse = {
  id: "m-new",
  conversationId: "c-1",
  direction: "OUTBOUND",
  externalMessageId: null,
  kind: "TEXT",
  content: "Hola",
  replyToExternalId: null,
  createdAt: "2026-10-05T12:05:00.000Z",
  updatedAt: "2026-10-05T12:05:00.000Z",
};

const fetcher = vi.fn<(key: string) => Promise<unknown>>();

function Probe() {
  const messages = useApiQuery<MessageResponse[]>(messagesKey("c-1"));
  useApiQuery<ConversationResponse[]>(CONVERSATIONS_KEY);
  const sender = useConversationSender("c-1", "INSTAGRAM");
  return (
    <>
      <button type="button" onClick={() => void sender.send("Hola")}>
        Enviar
      </button>
      <ul>
        {(messages.data ?? []).map((message) => (
          <li key={message.id}>{message.content}</li>
        ))}
        {sender.pending.map((item) => (
          <li key={item.tempId}>{item.content}</li>
        ))}
      </ul>
    </>
  );
}

beforeEach(() => {
  clearQueryCache();
  fetcher.mockReset();
  vi.mocked(api.post).mockReset();
  setQueryFetcher(fetcher);
});

afterEach(() => {
  setQueryFetcher(null);
});

function CommentProbe() {
  const sender = useConversationSender("c-1", "INSTAGRAM");
  return (
    <button type="button" onClick={() => void sender.replyToComment("c-9", "gracias")}>
      Responder
    </button>
  );
}

describe("useConversationSender", () => {
  it("posts a public reply to the comment", async () => {
    vi.mocked(api.post).mockResolvedValue({ ...created, kind: "COMMENT", content: "gracias" });

    render(<CommentProbe />);
    await userEvent.click(screen.getByRole("button", { name: "Responder" }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(messagesKey("c-1"), {
        direction: "OUTBOUND",
        kind: "COMMENT",
        content: "gracias",
        replyToMessageId: "c-9",
      }),
    );
  });

  it("publishes one copy of the reply and clears the handoff", async () => {
    let resolvePost: (message: MessageResponse) => void = () => undefined;
    vi.mocked(api.post).mockReturnValue(
      new Promise((resolve) => {
        resolvePost = resolve;
      }),
    );
    fetcher.mockImplementation((key: string) => {
      if (key === CONVERSATIONS_KEY) return Promise.resolve([conversation]);
      if (key === messagesKey("c-1")) return Promise.resolve([]);
      return Promise.resolve(undefined);
    });

    render(<Probe />);
    await waitFor(() => expect(fetcher).toHaveBeenCalledWith(CONVERSATIONS_KEY));
    fetcher.mockImplementation(() => new Promise(() => undefined));

    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));
    await waitFor(() => expect(screen.getAllByText("Hola")).toHaveLength(1));

    resolvePost(created);

    await waitFor(() => {
      expect(getQueryState<ConversationResponse[]>(CONVERSATIONS_KEY).data?.[0]).toMatchObject({
        needsAttention: false,
        attentionReason: null,
        lastMessagePreview: "Hola",
        lastMessageDirection: "OUTBOUND",
      });
    });
    await waitFor(() => expect(screen.getAllByText("Hola")).toHaveLength(1));
  });
});
