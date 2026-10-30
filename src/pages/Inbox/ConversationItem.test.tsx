import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { i18n } from "../../i18n";
import type { ConversationResponse } from "../../api/types";
import { ConversationItem } from "./ConversationItem";
import { toRows } from "./inboxModel";

function row(patch: Partial<ConversationResponse> = {}) {
  const conversation: ConversationResponse = {
    id: "c-1",
    leadId: "l-1",
    platform: "MELI",
    externalThreadId: null,
    salesStage: "POST_SALE",
    status: "OPEN",
    leadName: "CAROLINA_PZ",
    lastMessageDirection: "INBOUND",
    createdAt: "2026-10-05T12:00:00.000Z",
    updatedAt: "2026-10-05T12:00:00.000Z",
    ...patch,
  };
  return toRows([conversation], new Map())[0];
}

function renderItem(patch: Partial<ConversationResponse> = {}) {
  render(
    <MemoryRouter>
      <ul>
        <ConversationItem row={row(patch)} to="/app/inbox?id=c-1" selected={false} />
      </ul>
    </MemoryRouter>,
  );
}

describe("ConversationItem", () => {
  it("names the agent that is composing instead of waiting for a reply", () => {
    renderItem({ workingAgentName: "Ventas" });
    expect(screen.getByRole("link", { name: /CAROLINA_PZ/ })).toHaveTextContent("Ventas está respondiendo");
    expect(screen.queryByText("Esperando respuesta")).toBeNull();
  });

  it("says the chat is waiting when nobody is composing", () => {
    renderItem();
    expect(screen.getByText("Esperando respuesta")).toBeInTheDocument();
  });
});

describe("ConversationItem in English", () => {
  it("shows the preview prefix, the wait and the unread count", async () => {
    await i18n.changeLanguage("en");
    renderItem({ unreadCount: 3 });
    expect(screen.getByText("Awaiting reply")).toBeInTheDocument();
    expect(screen.getByText("3 unread")).toBeInTheDocument();
  });

  it("marks your own last message", async () => {
    await i18n.changeLanguage("en");
    renderItem({ lastMessagePreview: "Gracias", lastMessageDirection: "OUTBOUND" });
    expect(screen.getByRole("link", { name: /CAROLINA_PZ/ })).toHaveTextContent("You: Gracias");
  });
});
