import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import type { ConversationResponse, LeadResponse } from "../../api/types";
import { ToastContext } from "../../components/ui/toast";
import { clearQueryCache, setQueryFetcher } from "../../data/queryCache";
import { i18n } from "../../i18n";
import { LeadDetail } from "./LeadDetail";

const LEAD: LeadResponse = {
  id: "a",
  platform: "WHATSAPP",
  externalLeadId: null,
  name: "Martín Gómez",
  email: null,
  phone: null,
  status: "NEW",
  postSaleOnly: false,
  createdAt: "2026-10-01T10:00:00Z",
  updatedAt: "2026-10-01T10:00:00Z",
};

const CONVERSATION: ConversationResponse = {
  id: "c1",
  leadId: "a",
  platform: "WHATSAPP",
  externalThreadId: null,
  salesStage: "PRE_SALE",
  status: "OPEN",
  lastMessagePreview: "Gracias",
  lastMessageDirection: "OUTBOUND",
  lastMessageAt: "2026-10-01T11:00:00Z",
  unreadCount: 2,
  createdAt: "2026-10-01T10:00:00Z",
  updatedAt: "2026-10-01T11:00:00Z",
};

function renderDetail(conversations: ConversationResponse[]) {
  setQueryFetcher(async (key) => {
    if (key === "/leads/a") return LEAD;
    if (key.startsWith("/conversations")) return conversations;
    return [];
  });
  render(
    <MemoryRouter initialEntries={["/app/leads/a"]}>
      <ToastContext.Provider value={() => undefined}>
        <Routes>
          <Route path="/app/leads/:leadId" element={<LeadDetail />} />
        </Routes>
      </ToastContext.Provider>
    </MemoryRouter>,
  );
}

describe("LeadDetail", () => {
  afterEach(() => {
    setQueryFetcher(null);
    clearQueryCache();
  });

  it("shows the lead in Spanish", async () => {
    renderDetail([CONVERSATION]);
    expect(await screen.findByRole("heading", { level: 1, name: "Martín Gómez" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Eliminar Martín Gómez" })).toBeInTheDocument();
    expect(await screen.findByText("2 sin leer")).toBeInTheDocument();
    expect(screen.getByText("Vos:", { exact: false })).toBeInTheDocument();
  });

  it("shows the lead in English", async () => {
    await i18n.changeLanguage("en");
    renderDetail([CONVERSATION]);
    expect(await screen.findByRole("heading", { level: 1, name: "Martín Gómez" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Contact" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Conversations" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete Martín Gómez" })).toBeInTheDocument();
    expect(screen.getByText(/^Since /)).toBeInTheDocument();
    expect(await screen.findByText("2 unread")).toBeInTheDocument();
    expect(screen.getByText("You:", { exact: false })).toBeInTheDocument();
  });

  it("offers a new conversation in English when there is none", async () => {
    await i18n.changeLanguage("en");
    renderDetail([]);
    expect(await screen.findByText("No conversations with this person yet.")).toBeInTheDocument();
  });
});
