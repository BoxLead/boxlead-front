import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "../../i18n";
import { ConfirmConsumerRequest } from "./ConfirmConsumerRequest";

const fetchMock = vi.fn<typeof fetch>();

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function renderPage() {
  render(
    <MemoryRouter>
      <ConfirmConsumerRequest />
    </MemoryRouter>,
  );
}

beforeAll(async () => {
  await i18n.loadNamespaces("consumer");
});

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
  window.history.replaceState(null, "", "/");
});

describe("confirm consumer request", () => {
  it("posts the token of the fragment once, removes it from the address and shows the code", async () => {
    window.history.replaceState(null, "", "/confirmar-solicitud#token-de-prueba");
    fetchMock.mockResolvedValueOnce(json({ code: "BX-7KX2M9", kind: "CANCELLATION" }, 200));
    renderPage();
    expect(
      await screen.findByText("Confirmamos tu solicitud BX-7KX2M9. Te respondemos dentro de las 24 horas hábiles."),
    ).toHaveAttribute("role", "status");
    expect(window.location.hash).toBe("");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/consumer-requests\/confirm$/);
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({ token: "token-de-prueba" });
  });

  it("explains an invalid link and points to both forms", async () => {
    window.history.replaceState(null, "", "/confirmar-solicitud#usado");
    fetchMock.mockResolvedValueOnce(json({ error: "Bad Request", message: "x", code: "CONSUMER_REQUEST_TOKEN_INVALID" }, 400));
    renderPage();
    expect(await screen.findByRole("alert")).toHaveTextContent("Este link no sirve");
    expect(screen.getByRole("link", { name: "Botón de arrepentimiento" })).toHaveAttribute("href", "/arrepentimiento");
    expect(screen.getByRole("link", { name: "Botón de baja de servicio" })).toHaveAttribute("href", "/baja");
  });

  it("says the link is invalid without asking the API when there is no token", async () => {
    window.history.replaceState(null, "", "/confirmar-solicitud");
    renderPage();
    expect(await screen.findByRole("alert")).toHaveTextContent("Este link no sirve");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("retries with the same token after too many attempts", async () => {
    window.history.replaceState(null, "", "/confirmar-solicitud#token-de-prueba");
    fetchMock
      .mockResolvedValueOnce(json({ error: "Too Many Requests" }, 429))
      .mockResolvedValueOnce(json({ code: "BX-7KX2M9", kind: "WITHDRAWAL" }, 200));
    renderPage();
    expect(await screen.findByRole("alert")).toHaveTextContent("Hiciste demasiados intentos seguidos");
    await userEvent.click(screen.getByRole("button", { name: "Probar de nuevo" }));
    expect(await screen.findByText(/Confirmamos tu solicitud BX-7KX2M9/)).toBeInTheDocument();
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({ token: "token-de-prueba" });
  });
});
