import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ConversationContextResponse, ConversationResponse, MessageResponse } from "../../api/types";
import { ToastContext } from "../../components/ui/toast";
import { clearQueryCache, setQueryFetcher } from "../../data/queryCache";
import { i18n } from "../../i18n";
import { Inbox } from "./Inbox";

const NOW = new Date().toISOString();

const fetcher = vi.fn<(key: string) => Promise<unknown>>();

function conversation(patch: Partial<ConversationResponse>): ConversationResponse {
  return {
    id: "c-1",
    leadId: "l-1",
    platform: "WHATSAPP",
    externalThreadId: null,
    salesStage: "PRE_SALE",
    status: "OPEN",
    leadName: "Martín",
    lastMessagePreview: "¿Tienen stock?",
    lastMessageDirection: "INBOUND",
    lastMessageAt: NOW,
    unreadCount: 0,
    createdAt: NOW,
    updatedAt: NOW,
    ...patch,
  };
}

function message(patch: Partial<MessageResponse>): MessageResponse {
  return {
    id: "m-1",
    conversationId: "c-1",
    direction: "INBOUND",
    externalMessageId: "ext-1",
    kind: "TEXT",
    content: "¿Tienen stock?",
    contextRef: null,
    replyToExternalId: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...patch,
  };
}

function serve(routes: Record<string, unknown>) {
  fetcher.mockImplementation(async (key) => routes[key]);
}

function renderInbox(path = "/app/inbox") {
  render(
    <MemoryRouter initialEntries={[path]}>
      <ToastContext.Provider value={() => undefined}>
        <Inbox />
      </ToastContext.Provider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  clearQueryCache();
  fetcher.mockReset();
  setQueryFetcher(fetcher);
});

afterEach(() => {
  setQueryFetcher(null);
});

describe("Inbox", () => {
  it("shows the empty inbox in Spanish", async () => {
    serve({ "/conversations": [] });
    renderInbox();
    expect(screen.getByRole("heading", { name: "Bandeja" })).toBeInTheDocument();
    expect(await screen.findByText("Tu bandeja está vacía")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Conectar un canal" })).toHaveAttribute("href", "/app/connections");
  });
});

describe("Inbox in English", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("shows the empty inbox", async () => {
    serve({ "/conversations": [] });
    renderInbox();
    expect(screen.getByRole("heading", { name: "Inbox" })).toBeInTheDocument();
    expect(await screen.findByText("Your inbox is empty")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Connect a channel" })).toBeInTheDocument();
    expect(screen.getByText("Pick a conversation")).toBeInTheDocument();
  });

  it("lists the conversations and opens a chat", async () => {
    serve({
      "/conversations": [conversation({ unreadCount: 0 })],
      "/conversations/c-1/messages": [message({})],
      "/conversations/c-1/draft": undefined,
    });
    renderInbox("/app/inbox?id=c-1");

    const list = await screen.findByRole("list", { name: "Conversations" });
    expect(within(list).getByText("Awaiting reply")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search by name or message")).toBeInTheDocument();
    expect(screen.getByText("Unread only")).toBeInTheDocument();

    const view = screen.getByRole("region", { name: "Conversation with Martín" });
    expect(within(view).getByRole("link", { name: "Back to list" })).toBeInTheDocument();
    expect(within(view).getByRole("button", { name: "Delete conversation with Martín" })).toBeInTheDocument();
    expect(await within(view).findByText("Today")).toBeInTheDocument();
    expect(within(view).getByLabelText("Reply to Martín")).toBeInTheDocument();
    expect(within(view).getByText("Enter to send, Shift + Enter for a new line.")).toBeInTheDocument();
    expect(within(view).getByRole("button", { name: "Template" })).toBeInTheDocument();
    expect(within(view).getByRole("button", { name: "Send" })).toBeInTheDocument();
  });

  it("shows the questions and the sale of a MercadoLibre conversation", async () => {
    const context: ConversationContextResponse = {
      items: [
        {
          kind: "ORDER",
          externalId: "2000",
          title: null,
          imageUrl: null,
          url: null,
          price: 1500,
          currency: "ARS",
          status: null,
          quantity: null,
          createdAt: null,
          lines: [{ externalItemId: null, title: null, quantity: 1, unitPrice: null, currency: null }],
        },
      ],
    } as ConversationContextResponse;
    serve({
      "/conversations": [conversation({ platform: "MELI", leadName: "CAROLINA_PZ" })],
      "/conversations/c-1/messages": [message({ contextRef: "MLA1", content: "" })],
      "/conversations/c-1/context": context,
      "/conversations/c-1/draft": undefined,
    });
    renderInbox("/app/inbox?id=c-1");

    expect(await screen.findByText("Order #2000")).toBeInTheDocument();
    expect(screen.getByText("Product")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(await screen.findByText("Listing MLA1")).toBeInTheDocument();
    expect(screen.getByText("Question with no text")).toBeInTheDocument();
    expect(screen.getByText("Next to answer")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reply" })).toBeInTheDocument();
  });

  it("explains a missing conversation", async () => {
    serve({ "/conversations": [conversation({})] });
    renderInbox("/app/inbox?id=other");
    expect(await screen.findByText("We couldn't find this conversation")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to inbox" })).toHaveAttribute("href", "/app/inbox");
  });
});
