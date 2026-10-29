import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConfirmEmail } from "./ConfirmEmail";

const fetchMock = vi.fn<typeof fetch>();

function renderPage() {
  render(
    <MemoryRouter>
      <ConfirmEmail />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
  window.history.replaceState(null, "", "/");
});

describe("confirm email", () => {
  it("sends the token of the fragment and removes it from the address", async () => {
    window.history.replaceState(null, "", "/confirmar-email#token-de-prueba");
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    renderPage();
    expect(await screen.findByText("Listo, confirmaste tu email.")).toBeInTheDocument();
    expect(window.location.hash).toBe("");
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/auth\/email\/verify$/);
    expect(JSON.parse(String(init?.body))).toEqual({ token: "token-de-prueba" });
  });

  it("explains an invalid link", async () => {
    window.history.replaceState(null, "", "/confirmar-email#vencido");
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Bad Request", message: "x", code: "INVALID_TOKEN" }), { status: 400 }),
    );
    renderPage();
    expect(await screen.findByRole("alert")).toHaveTextContent("Este link no sirve");
  });

  it("says there were too many attempts and retries with the same token", async () => {
    window.history.replaceState(null, "", "/confirmar-email#token-de-prueba");
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "Too Many Requests" }), { status: 429 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    renderPage();
    expect(await screen.findByRole("alert")).toHaveTextContent("Hiciste demasiados intentos seguidos");
    expect(screen.queryByText(/Revisá tu conexión/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Probar de nuevo" }));
    expect(await screen.findByText("Listo, confirmaste tu email.")).toBeInTheDocument();
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({ token: "token-de-prueba" });
  });

  it("explains a missing token without calling the API", async () => {
    renderPage();
    expect(await screen.findByRole("alert")).toHaveTextContent("Este link no sirve");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
