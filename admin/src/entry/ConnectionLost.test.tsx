import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import { adminApi } from "../api/client";
import { SessionProvider } from "../session/SessionProvider";
import { mockFetch } from "../test/fetch";
import { readyBackend, stubReload } from "../test/session";

const TITLE = "Se cortó la conexión con BoxLead";

afterEach(() => {
  vi.unstubAllGlobals();
});

function Probe() {
  return (
    <button type="button" onClick={() => void adminApi.get("/admin/probe").catch(() => undefined)}>
      Cargar
    </button>
  );
}

function renderApp(path = "/no-existe") {
  render(
    <MemoryRouter initialEntries={[path]}>
      <SessionProvider>
        <App />
        <Probe />
      </SessionProvider>
    </MemoryRouter>,
  );
}

describe("ConnectionLost", () => {
  it("stays hidden on a normal start", async () => {
    readyBackend(["OWNER"]);
    renderApp();
    expect(await screen.findByRole("heading", { level: 1, name: "No encontramos esta pantalla" })).toBeInTheDocument();
    expect(screen.queryByText(TITLE)).toBeNull();
  });

  it("stays hidden when the start cannot reach the API, which has its own screen", async () => {
    mockFetch(() => new TypeError("Failed to fetch"));
    renderApp();
    expect(await screen.findByRole("heading", { name: "No pudimos conectar con BoxLead" })).toBeInTheDocument();
    expect(screen.queryByText(TITLE)).toBeNull();
  });

  it("shows up over the layout when a request loses the connection and the button reloads", async () => {
    readyBackend(["OWNER"], (_method, url) => (url.pathname === "/admin/probe" ? new TypeError("Failed to fetch") : undefined));
    renderApp();
    expect(await screen.findByRole("heading", { level: 1, name: "No encontramos esta pantalla" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Cargar" }));
    expect(await screen.findByText(TITLE)).toBeInTheDocument();
    expect(screen.getByText("Puede que tu acceso haya vencido. Recargá la página para volver a entrar.")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Secciones" })).toBeInTheDocument();
    const reload = stubReload();
    await userEvent.click(screen.getByRole("button", { name: "Recargar" }));
    expect(reload).toHaveBeenCalledOnce();
  });
});
