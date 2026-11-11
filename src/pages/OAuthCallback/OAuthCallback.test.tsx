import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ToastContext } from "../../components/ui/toast";
import { i18n } from "../../i18n";
import { OAuthCallback } from "./OAuthCallback";

function renderCallback(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <ToastContext.Provider value={() => undefined}>
        <Routes>
          <Route path="/app/oauth/callback/:platform" element={<OAuthCallback />} />
        </Routes>
      </ToastContext.Provider>
    </MemoryRouter>,
  );
}

describe("OAuthCallback", () => {
  it("explains a canceled authorization in Spanish", () => {
    renderCallback("/app/oauth/callback/MELI?error=access_denied");
    expect(screen.getByRole("heading", { name: "No pudimos conectar MercadoLibre" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Cancelaste la autorización en MercadoLibre. Podés intentarlo de nuevo cuando quieras.",
    );
    expect(screen.getByRole("link", { name: "Volver a conexiones" })).toBeInTheDocument();
  });

  it("never shows the description the provider put in the link", async () => {
    await i18n.changeLanguage("es");
    renderCallback("/app/oauth/callback/MELI?error=server_error&error_description=Tu+cuenta+fue+suspendida.+Llam%C3%A1+al+0800");
    expect(screen.getByRole("alert")).toHaveTextContent("MercadoLibre no autorizó la conexión (server_error).");
    expect(screen.queryByText(/suspendida/)).toBeNull();
  });

  it("does not repeat an error code that is not a plain code", async () => {
    await i18n.changeLanguage("es");
    renderCallback("/app/oauth/callback/MELI?error=Tu%20cuenta%20fue%20suspendida");
    expect(screen.getByRole("alert")).toHaveTextContent("No pudimos completar la conexión.");
    expect(screen.queryByText(/suspendida/)).toBeNull();
  });

  it("explains the failures in English", async () => {
    await i18n.changeLanguage("en");
    renderCallback("/app/oauth/callback/INSTAGRAM?error=access_denied");
    expect(screen.getByRole("heading", { name: "We couldn't connect Instagram" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "You canceled the authorization on Instagram. You can try again whenever you want.",
    );
    expect(screen.getByRole("link", { name: "Back to connections" })).toBeInTheDocument();
  });

  it("rejects an unknown channel in English", async () => {
    await i18n.changeLanguage("en");
    renderCallback("/app/oauth/callback/MYSPACE?code=1");
    expect(screen.getByRole("heading", { name: "We couldn't connect the account" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("The connection link isn't valid.");
  });
});
