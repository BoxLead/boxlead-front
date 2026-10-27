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

  it("asks for the customer session and the admin session together at startup", async () => {
    const calls = mockFetch((_method, url) => {
      if (url.pathname === "/auth/me") return json(200, USER);
      if (url.pathname === "/admin/me") return json(200, { ...ME, adminSessionExpiresAt: LATER });
      return json(404, { error: "Not found", message: "Not found" });
    });
    renderApp();
    expect(await screen.findByRole("heading", { level: 1, name: "Inicio" })).toBeInTheDocument();
    expect(calls.slice(0, 2).map((call) => call.url.pathname).sort()).toEqual(["/admin/me", "/auth/me"]);
    expect(calls.filter((call) => call.url.pathname === "/admin/me")).toHaveLength(1);
  });

  it("keeps the login when the admin session answers 401 without a customer session", async () => {
    mockFetch((_method, url) => {
      if (url.pathname === "/auth/me") return json(401, { error: "Unauthorized", message: "Unauthorized" });
      if (url.pathname === "/admin/me") return json(401, { error: "Unauthorized", message: "Unauthorized" });
      return json(404, { error: "Not found", message: "Not found" });
    });
    renderApp();
    expect(await screen.findByRole("heading", { name: "Entrar" })).toBeInTheDocument();
    expect(screen.getByText("Si ya tenés sesión abierta en boxlead.app entrás directo. Si no, usá tu email y tu contraseña.")).toBeInTheDocument();
  });

  it("explains a 404 of the admin session as another account than the one in Cloudflare Access", async () => {
    mockFetch((_method, url) => {
      if (url.pathname === "/auth/me") return json(200, USER);
      if (url.pathname === "/admin/me") return json(404, { error: "Not found", message: "Not found" });
      return json(404, { error: "Not found", message: "Not found" });
    });
    renderApp();
    expect(await screen.findByRole("heading", { name: "Entraste con otra cuenta" })).toBeInTheDocument();
    expect(screen.getByText("Entraste a BoxLead con una cuenta distinta a la de Cloudflare Access. Salí y volvé a entrar.")).toBeInTheDocument();
    expect(screen.getByText("En BoxLead estás como equipo@boxlead.app.")).toBeInTheDocument();
  });

  it("reloads the admin session when the enrollment is refused with 403", async () => {
    let confirmed = false;
    mockFetch((method, url) => {
      if (url.pathname === "/auth/me") return json(200, USER);
      if (url.pathname === "/admin/me") {
        return confirmed
          ? json(403, { error: "Forbidden", message: "Role required", code: "ROLE_REQUIRED" })
          : json(200, { ...ME, factorConfirmed: false, enrollmentOpenUntil: LATER });
      }
      if (url.pathname === "/admin/mfa/enrollment" && method === "POST") return json(200, { otpauthUri: "otpauth://totp/BoxLead:equipo?secret=JBSWY3DP&issuer=BoxLead" });
      if (url.pathname === "/admin/mfa/confirm" && method === "POST") {
        confirmed = true;
        return json(403, { error: "Forbidden", message: "Role required", code: "ROLE_REQUIRED" });
      }
      return json(404, { error: "Not found", message: "Not found" });
    });
    renderApp();
    await userEvent.click(await screen.findByRole("button", { name: "Generar código QR" }));
    await userEvent.type(await screen.findByLabelText("Código de 6 números"), "123456");
    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(await screen.findByRole("heading", { name: "Esta cuenta no tiene acceso" })).toBeInTheDocument();
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
