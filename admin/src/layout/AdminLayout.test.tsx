import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AdminRole } from "../api/types";
import { SessionProvider } from "../session/SessionProvider";
import { useSession } from "../session/session";
import { json } from "../test/fetch";
import { readyBackend } from "../test/session";
import { AdminLayout } from "./AdminLayout";

afterEach(() => {
  vi.unstubAllGlobals();
});

function Where() {
  const location = useLocation();
  return <h1>{location.pathname}</h1>;
}

function Harness() {
  const { stage } = useSession();
  if (stage.kind !== "ready") return <p>{stage.kind}</p>;
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route path="*" element={<Where />} />
      </Route>
    </Routes>
  );
}

async function renderLayout(path = "/") {
  render(
    <MemoryRouter initialEntries={[path]}>
      <SessionProvider>
        <Harness />
      </SessionProvider>
    </MemoryRouter>,
  );
  return screen.findByRole("navigation", { name: "Secciones" });
}

function linksOf(nav: HTMLElement) {
  return within(nav)
    .getAllByRole("link")
    .map((link) => link.textContent);
}

function headingsOf(nav: HTMLElement) {
  return Array.from(nav.querySelectorAll(".admin-nav-heading"), (heading) => heading.textContent);
}

const EVERY = [
  "Inicio",
  "Usuarios",
  "Suscripciones",
  "Pagos",
  "Reembolsos",
  "Facturas",
  "Invitaciones y Demo",
  "Revendedores",
  "Comisiones",
  "Liquidaciones",
  "Uso de IA",
  "Pedidos de consumo",
  "Equipo",
  "Auditoría",
];

const MENUS: { roles: AdminRole[]; tags: string[]; sections: string[]; links: string[] }[] = [
  {
    roles: ["OWNER"],
    tags: ["Dueño"],
    sections: ["Clientes", "Cobros", "Demo", "Referidos", "Operación"],
    links: EVERY,
  },
  {
    roles: ["FINANCE"],
    tags: ["Finanzas"],
    sections: ["Clientes", "Cobros", "Referidos", "Operación"],
    links: ["Inicio", "Usuarios", "Suscripciones", "Pagos", "Reembolsos", "Facturas", "Revendedores", "Comisiones", "Liquidaciones", "Uso de IA", "Pedidos de consumo"],
  },
  {
    roles: ["SUPPORT"],
    tags: ["Soporte"],
    sections: ["Clientes", "Cobros", "Demo", "Referidos", "Operación"],
    links: ["Inicio", "Usuarios", "Suscripciones", "Pagos", "Invitaciones y Demo", "Revendedores", "Uso de IA", "Pedidos de consumo"],
  },
  {
    roles: ["FINANCE", "SUPPORT"],
    tags: ["Finanzas", "Soporte"],
    sections: ["Clientes", "Cobros", "Demo", "Referidos", "Operación"],
    links: EVERY.filter((label) => label !== "Equipo" && label !== "Auditoría"),
  },
];

describe("AdminLayout", () => {
  it.each(MENUS)("shows only the sections of $roles", async ({ roles, tags, sections, links }) => {
    readyBackend(roles);
    const nav = await renderLayout();
    expect(headingsOf(nav)).toEqual(sections);
    expect(linksOf(nav)).toEqual(links);
    for (const tag of tags) expect(screen.getByText(tag)).toBeInTheDocument();
    expect(screen.getByText("equipo@boxlead.app")).toBeInTheDocument();
  });

  it("marks the active route, child paths included, and follows the links", async () => {
    readyBackend(["OWNER"]);
    const nav = await renderLayout("/usuarios/u1");
    const customers = within(nav).getByRole("link", { name: "Usuarios" });
    expect(customers).toHaveAttribute("aria-current", "page");
    expect(customers).toHaveClass("admin-nav-link-active");
    expect(within(nav).getByRole("link", { name: "Inicio" })).not.toHaveAttribute("aria-current");
    await userEvent.click(within(nav).getByRole("link", { name: "Pagos" }));
    expect(screen.getByRole("heading", { level: 1, name: "/pagos" })).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: "Pagos" })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: "Usuarios" })).not.toHaveAttribute("aria-current");
  });

  it("closes the admin session and then the BoxLead session when leaving", async () => {
    const calls = readyBackend(["OWNER"], (method, url) => {
      if (url.pathname === "/admin/session" && method === "DELETE") return json(204);
      if (url.pathname === "/auth/logout" && method === "POST") return json(204);
      return undefined;
    });
    await renderLayout();
    const before = calls.length;
    await userEvent.click(screen.getByRole("button", { name: "Salir" }));
    expect(await screen.findByText("signed-out")).toBeInTheDocument();
    expect(calls.slice(before).map((call) => `${call.method} ${call.url.pathname}`)).toEqual(["DELETE /admin/session", "POST /auth/logout"]);
  });

  it("opens and closes the menu with the keyboard at 320 px", async () => {
    vi.stubGlobal("innerWidth", 320);
    window.dispatchEvent(new Event("resize"));
    readyBackend(["OWNER"]);
    const nav = await renderLayout();
    const toggle = screen.getByRole("button", { name: "Menú" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(document.getElementById(toggle.getAttribute("aria-controls") ?? "")).toContainElement(nav);

    await userEvent.tab();
    expect(toggle).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(within(nav).getByRole("link", { name: "Inicio" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Cerrar el menú" })).toBeInTheDocument();

    await userEvent.keyboard("{Escape}");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: "Cerrar el menú" })).toBeNull();
    expect(toggle).toHaveFocus();

    await userEvent.keyboard(" ");
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    await userEvent.tab();
    expect(within(nav).getByRole("link", { name: "Usuarios" })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(screen.getByRole("heading", { level: 1, name: "/usuarios" })).toBeInTheDocument();
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await userEvent.click(toggle);
    await userEvent.click(screen.getByRole("button", { name: "Cerrar el menú" }));
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });
});
