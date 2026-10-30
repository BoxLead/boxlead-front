import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { AccountConnectionResponse } from "../../api/types";
import { ToastContext } from "../../components/ui/toast";
import { i18n } from "../../i18n";
import { Connections } from "./Connections";

const accounts: AccountConnectionResponse[] = [
  {
    id: "1",
    platform: "INSTAGRAM",
    externalAccountId: "ig-1",
    displayName: "tienda.sol",
    connectedAt: "2026-10-01T12:00:00.000Z",
    needsReconnection: true,
    failedEventCount: 2,
  },
];

vi.mock("../../hooks/useApiQuery", () => ({
  useApiQuery: () => ({ data: accounts, error: null, loading: false, reload: () => undefined }),
}));

function renderConnections() {
  render(
    <MemoryRouter>
      <ToastContext.Provider value={() => undefined}>
        <Connections />
      </ToastContext.Provider>
    </MemoryRouter>,
  );
}

describe("Connections", () => {
  it("shows the channels in Spanish", () => {
    renderConnections();
    expect(screen.getByText("de 4 canales conectados", { exact: false })).toHaveTextContent("1 de 4 canales conectados");
    expect(screen.getByText("Reconectá tienda.sol")).toBeInTheDocument();
    expect(screen.getByText("Instagram revocó o venció la autorización. Mientras tanto no llegan mensajes nuevos ni se pueden enviar respuestas.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Conectar MercadoLibre" })).toBeInTheDocument();
  });

  it("shows the channels in English", async () => {
    await i18n.changeLanguage("en");
    renderConnections();

    expect(screen.getByRole("heading", { level: 1, name: "Connections" })).toBeInTheDocument();
    expect(screen.getByText("channels connected", { exact: false })).toHaveTextContent("1 of 4 channels connected");
    expect(screen.getByText("Reconnect tienda.sol")).toBeInTheDocument();

    const channels = screen.getByRole("list", { name: "Channels" });
    const meli = within(channels).getByRole("listitem", { name: "MercadoLibre" });
    expect(meli).toHaveTextContent("Answer questions on your listings and messages about your sales from BoxLead.");
    expect(meli).toHaveTextContent("What comes into BoxLead");
    expect(meli).toHaveTextContent("You authorize BoxLead from your MercadoLibre seller account.");
    expect(within(meli).getByRole("button", { name: "Connect MercadoLibre" })).toBeInTheDocument();

    const instagram = within(channels).getByRole("listitem", { name: "Instagram" });
    expect(instagram).toHaveTextContent("Needs reconnecting");
    expect(instagram).toHaveTextContent("2 failed notifications this week");
    expect(within(instagram).getByRole("button", { name: "Disconnect tienda.sol" })).toBeInTheDocument();
    expect(within(instagram).getByRole("button", { name: "Add another account" })).toBeInTheDocument();
  });
});
