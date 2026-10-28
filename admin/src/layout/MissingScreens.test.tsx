import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import type { AdminRole } from "../api/types";
import { SessionProvider } from "../session/SessionProvider";
import { readyBackend } from "../test/session";

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderApp(roles: AdminRole[], path: string) {
  readyBackend(roles);
  render(
    <MemoryRouter initialEntries={[path]}>
      <SessionProvider>
        <App />
      </SessionProvider>
    </MemoryRouter>,
  );
}

async function goHome() {
  const link = screen.getByRole("link", { name: "Ir al inicio" });
  expect(link).toHaveAttribute("href", "/");
  await userEvent.click(link);
  expect(await screen.findByRole("heading", { level: 1, name: "Inicio" }, { timeout: 5000 })).toBeInTheDocument();
}

describe("MissingScreens", () => {
  it("explains a route that does not exist and goes back home", async () => {
    renderApp(["OWNER"], "/no-existe");
    expect(await screen.findByRole("heading", { level: 1, name: "No encontramos esta pantalla" })).toBeInTheDocument();
    expect(screen.getByText("La dirección no existe en el backoffice")).toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe("No encontramos esta pantalla · Backoffice de BoxLead"));
    expect(screen.getByRole("navigation", { name: "Secciones" })).toBeInTheDocument();
    await goHome();
  }, 20_000);

  it.each<{ roles: AdminRole[]; path: string; label: string }>([
    { roles: ["SUPPORT"], path: "/equipo", label: "Equipo" },
    { roles: ["FINANCE"], path: "/invitaciones", label: "Invitaciones y Demo" },
    { roles: ["SUPPORT"], path: "/facturas", label: "Facturas" },
  ])("tells $roles that the role cannot see $path and goes back home", async ({ roles, path, label }) => {
    renderApp(roles, path);
    expect(await screen.findByRole("heading", { level: 1, name: "Sin permiso" })).toBeInTheDocument();
    expect(screen.getByText("Tu rol no ve esta pantalla")).toBeInTheDocument();
    expect(screen.getByText("Si la necesitás, pedile a un dueño del equipo que te sume el rol.")).toBeInTheDocument();
    expect(within(screen.getByRole("navigation", { name: "Secciones" })).queryByRole("link", { name: label })).toBeNull();
    await goHome();
  }, 20_000);
});
