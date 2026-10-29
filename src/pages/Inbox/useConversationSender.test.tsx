import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "../../api/client";
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

function CopiesProbe({ copies }: { copies: number[] }) {
  const messages = useApiQuery<MessageResponse[]>(messagesKey("c-1"));
  const sender = useConversationSender("c-1", "INSTAGRAM");
  const delivered = (messages.data ?? []).filter((message) => message.content === "Hola").length;
  const pending = sender.pending.filter((item) => item.content === "Hola").length;
  copies.push(delivered + pending);
  return (
    <button type="button" onClick={() => void sender.send("Hola")}>
      Enviar
    </button>
  );
}

function CommentProbe() {
  const sender = useConversationSender("c-1", "INSTAGRAM");
  return (
    <button type="button" onClick={() => void sender.replyToComment("c-9", "gracias")}>
      Responder
    </button>
  );
}

function TemplateProbe() {
  const sender = useConversationSender("c-1", "WHATSAPP");
  return (
    <>
      <button type="button" onClick={() => void sender.sendTemplate("t-1", ["Ana", "#123"])}>
        Plantilla
      </button>
      <p>{sender.failure?.title}</p>
      <p>{sender.failure?.action}</p>
    </>
  );
}

describe("useConversationSender", () => {
  it("posts a template with its values", async () => {
    vi.mocked(api.post).mockResolvedValue({ ...created, content: "Hola Ana, tu pedido #123 salió" });

    render(<TemplateProbe />);
    await userEvent.click(screen.getByRole("button", { name: "Plantilla" }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(messagesKey("c-1"), {
        direction: "OUTBOUND",
        template: { id: "t-1", parameters: ["Ana", "#123"] },
      }),
    );
  });

  it("offers a template when the 24 hour window is closed", async () => {
    vi.mocked(api.post).mockRejectedValue(
      new ApiError("Cannot send WhatsApp message: the reply window is closed, the customer has to write first", 409),
    );

    render(<TemplateProbe />);
    await userEvent.click(screen.getByRole("button", { name: "Plantilla" }));

    expect(await screen.findByText("Pasaron más de 24 horas")).toBeInTheDocument();
    expect(screen.getByText("template")).toBeInTheDocument();
  });

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

  it("never renders the delivered reply next to its pending copy", async () => {
    const copies: number[] = [];
    let resolvePost: (message: MessageResponse) => void = () => undefined;
    vi.mocked(api.post).mockReturnValue(
      new Promise((resolve) => {
        resolvePost = resolve;
      }),
    );
    fetcher.mockImplementation((key: string) => Promise.resolve(key === messagesKey("c-1") ? [] : undefined));

    render(<CopiesProbe copies={copies} />);
    await waitFor(() => expect(fetcher).toHaveBeenCalledWith(messagesKey("c-1")));
    fetcher.mockImplementation(() => new Promise(() => undefined));
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));
    await waitFor(() => expect(copies.at(-1)).toBe(1));

    resolvePost(created);

    await waitFor(() => expect(getQueryState<MessageResponse[]>(messagesKey("c-1")).data).toEqual([created]));
    expect(copies.at(-1)).toBe(1);
    expect(Math.max(...copies)).toBe(1);
  });
});
