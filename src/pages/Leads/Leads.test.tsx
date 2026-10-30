import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import type { LeadResponse } from "../../api/types";
import { ToastContext } from "../../components/ui/toast";
import { ALL_LEADS_KEY } from "../../data/leads";
import { clearQueryCache, setQueryFetcher } from "../../data/queryCache";
import { i18n } from "../../i18n";
import { Leads } from "./Leads";

const LEADS: LeadResponse[] = [
  {
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
  },
  {
    id: "b",
    platform: "MELI",
    externalLeadId: null,
    name: "Carolina",
    email: "caro@example.com",
    phone: null,
    status: "CONTACTED",
    postSaleOnly: true,
    createdAt: "2026-10-02T10:00:00Z",
    updatedAt: "2026-10-02T10:00:00Z",
  },
];

function renderLeads() {
  render(
    <MemoryRouter initialEntries={["/app/leads"]}>
      <ToastContext.Provider value={() => undefined}>
        <Leads />
      </ToastContext.Provider>
    </MemoryRouter>,
  );
}

describe("Leads", () => {
  afterEach(() => {
    setQueryFetcher(null);
    clearQueryCache();
  });

  it("shows the list in Spanish", async () => {
    setQueryFetcher(async (key) => (key === ALL_LEADS_KEY ? LEADS : []));
    renderLeads();
    expect(await screen.findByRole("link", { name: "Martín Gómez" })).toBeInTheDocument();
    expect(screen.getByText("Incluir compradores sin consulta previa (1)")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Primer contacto" })).toBeInTheDocument();
    expect(screen.getByText("Sin datos")).toBeInTheDocument();
  });

  it("shows the list in English", async () => {
    setQueryFetcher(async (key) => (key === ALL_LEADS_KEY ? LEADS : []));
    await i18n.changeLanguage("en");
    renderLeads();
    expect(await screen.findByRole("link", { name: "Martín Gómez" })).toBeInTheDocument();
    expect(screen.getByText("Everyone who reached out to you, in one place and with their status.")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search by name, email or phone")).toBeInTheDocument();
    expect(screen.getByText("Include buyers with no prior question (1)")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "First contact" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "All temperatures" })).toBeInTheDocument();
    expect(screen.getByText("1 lead")).toBeInTheDocument();
  });

  it("explains an empty account in English", async () => {
    setQueryFetcher(async () => []);
    await i18n.changeLanguage("en");
    renderLeads();
    expect(await screen.findByText("No leads yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Connect a channel" })).toHaveAttribute("href", "/app/connections");
  });
});
