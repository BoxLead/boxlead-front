import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ConversationResponse, MessageResponse } from "../../api/types";
import { ConversationHeader } from "./ConversationHeader";
import { MessageBubble } from "./MessageBubble";
import { toRows, type ConversationRow } from "./inboxModel";

function message(patch: Partial<MessageResponse> = {}): MessageResponse {
  return {
    id: "m-1",
    conversationId: "c-1",
    direction: "OUTBOUND",
    externalMessageId: null,
    kind: "TEXT",
    content: "Sí, hay stock",
    contextRef: null,
    replyToExternalId: null,
    createdAt: "2026-10-05T12:00:00.000Z",
    updatedAt: "2026-10-05T12:00:00.000Z",
    ...patch,
  };
}

function row(patch: Partial<ConversationResponse> = {}): ConversationRow {
  const conversation: ConversationResponse = {
    id: "c-1",
    leadId: "l-1",
    platform: "WHATSAPP",
    externalThreadId: null,
    salesStage: "PRE_SALE",
    status: "OPEN",
    leadName: "Martín Herrera",
    createdAt: "2026-10-05T12:00:00.000Z",
    updatedAt: "2026-10-05T12:00:00.000Z",
    ...patch,
  };
  return toRows([conversation], new Map())[0];
}

describe("MessageBubble", () => {
  it("names the agent that answered", () => {
    render(<MessageBubble message={message({ agentName: "Ventas" })} contactName="Martín" />);
    expect(screen.getByText("Respondido por Ventas")).toBeInTheDocument();
  });

  it("does not name an agent on inbound or human replies", () => {
    const { rerender } = render(<MessageBubble message={message({ agentName: null })} contactName="Martín" />);
    expect(screen.queryByText(/Respondido por/)).toBeNull();
    rerender(<MessageBubble message={message({ direction: "INBOUND", agentName: "Ventas" })} contactName="Martín" />);
    expect(screen.queryByText(/Respondido por/)).toBeNull();
  });
});

describe("ConversationHeader", () => {
  it("shows a handoff with its reason", () => {
    render(
      <MemoryRouter>
        <ConversationHeader
          row={row({ needsAttention: true, attentionReason: "El cliente pidió hablar con una persona." })}
          backTo="/app/inbox"
        />
      </MemoryRouter>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Un agente pidió tu atención");
    expect(screen.getByRole("status")).toHaveTextContent("El cliente pidió hablar con una persona.");
  });

  it("stays silent when nobody asked for attention", () => {
    render(
      <MemoryRouter>
        <ConversationHeader row={row()} backTo="/app/inbox" />
      </MemoryRouter>,
    );
    expect(screen.queryByText("Un agente pidió tu atención")).toBeNull();
  });
});
