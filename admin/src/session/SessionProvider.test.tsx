import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import { adminApi } from "../api/client";
import type { AdminMe } from "../api/types";
import { json, mockFetch } from "../test/fetch";
import { SessionProvider } from "./SessionProvider";
import { useSession } from "./session";

const LATER = new Date(Date.now() + 30 * 60_000).toISOString();
const USER = { userId: "u1", email: "equipo@boxlead.app", name: "Equipo" };
const ME: AdminMe = {
  userId: "u1",
  email: "equipo@boxlead.app",
  roles: ["OWNER"],
  factorConfirmed: true,
  enrollmentOpenUntil: null,
  factorLockedUntil: null,
  adminSessionExpiresAt: null,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderApp(path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SessionProvider>
        <App />
      </SessionProvider>
    </MemoryRouter>,
  );
}

function Probe() {
  const { reauthenticating } = useSession();
  const [result, setResult] = useState("");
  return (
    <>
      <p>{reauthenticating ? "pidiendo código" : "sin pedido"}</p>
      <button type="button" onClick={() => void adminApi.get<{ total: number }>("/admin/probe").then((data) => setResult(`total ${data.total}`), () => setResult("falló"))}>
        Cargar
      </button>
      <p>{result}</p>
    </>
  );
}

describe("SessionProvider", () => {
  it("goes from the login to the code to the layout", async () => {
    let signedIn = false;
    let session = false;
    mockFetch((method, url) => {
      if (url.pathname === "/auth/me") return signedIn ? json(200, USER) : json(401, { error: "Unauthorized", message: "Unauthorized" });
      if (url.pathname === "/auth/login") {
        signedIn = true;
        return json(200, USER);
      }
      if (url.pathname === "/admin/me") return json(200, { ...ME, adminSessionExpiresAt: session ? LATER : null });
      if (url.pathname === "/admin/session" && method === "POST") {
        session = true;
        return json(200, { expiresAt: LATER });
      }
      return json(404, { error: "Not found", message: "Not found" });
    });
    renderApp("/equipo");
    await userEvent.type(await screen.findByLabelText("Email"), "equipo@boxlead.app");
    await userEvent.type(screen.getByLabelText("Contraseña"), "demo1234");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));
    await userEvent.type(await screen.findByLabelText("Código de 6 números"), "123456");
    await userEvent.click(screen.getByRole("button", { name: "Abrir sesión" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Equipo" })).toBeInTheDocument();
    expect(screen.getByText("equipo@boxlead.app")).toBeInTheDocument();
  });

  it("shows the locked factor after too many wrong codes", async () => {
    let locked = false;
    mockFetch((_method, url) => {
      if (url.pathname === "/auth/me") return json(200, USER);
      if (url.pathname === "/admin/me") return json(200, { ...ME, factorLockedUntil: locked ? LATER : null });
      locked = true;
      return json(423, { error: "Locked", message: "Locked", code: "MFA_LOCKED" });
    });
    renderApp();
    await userEvent.type(await screen.findByLabelText("Código de 6 números"), "000000");
    await userEvent.click(screen.getByRole("button", { name: "Abrir sesión" }));
    expect(await screen.findByText("El factor está bloqueado")).toBeInTheDocument();
    expect(screen.getByLabelText("Código de 6 números")).toBeDisabled();
  });

  function reauthBackend() {
    let session = false;
    const calls = mockFetch((method, url) => {
      if (url.pathname === "/auth/me") return json(200, USER);
      if (url.pathname === "/admin/me") return json(200, { ...ME, adminSessionExpiresAt: LATER });
      if (url.pathname === "/admin/session" && method === "POST") {
        session = true;
        return json(200, { expiresAt: LATER });
      }
      if (url.pathname === "/admin/probe") {
        return session
          ? json(200, { total: 3 })
          : json(401, { error: "Unauthorized", message: "An admin session is required", code: "ADMIN_SESSION_REQUIRED" });
      }
      return json(404, { error: "Not found", message: "Not found" });
    });
    render(
      <MemoryRouter>
        <SessionProvider>
          <App />
          <Probe />
        </SessionProvider>
      </MemoryRouter>,
    );
    return calls;
  }

  it("asks for the code in a dialog and retries the request that needed it", async () => {
    const calls = reauthBackend();
    expect(await screen.findByRole("heading", { level: 1, name: "Inicio" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Cargar" }));
    expect(await screen.findByText("pidiendo código")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Código de 6 números"), "123456");
    await userEvent.click(screen.getByRole("button", { name: "Seguir", hidden: true }));
    expect(await screen.findByText("total 3")).toBeInTheDocument();
    expect(screen.getByText("sin pedido")).toBeInTheDocument();
    expect(calls.filter((call) => call.url.pathname === "/admin/probe")).toHaveLength(2);
  });

  it("fails the request when the code is canceled", async () => {
    reauthBackend();
    expect(await screen.findByRole("heading", { level: 1, name: "Inicio" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Cargar" }));
    await userEvent.click(await screen.findByRole("button", { name: "Cancelar", hidden: true }));
    expect(await screen.findByText("falló")).toBeInTheDocument();
  });
});
