import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RouteErrorBoundary } from "./RouteErrorBoundary";

function Explodes({ message }: { message: string }) {
  const [broken, setBroken] = useState(true);
  if (broken) throw new Error(message);
  return (
    <p>
      Recuperado <button onClick={() => setBroken(true)}>romper</button>
    </p>
  );
}

let flakyBroken = true;

function Flaky() {
  if (flakyBroken) throw new Error("render failed");
  return <p>Todo bien</p>;
}

function swallowRecoverableErrors(event: ErrorEvent) {
  event.preventDefault();
}

describe("RouteErrorBoundary", () => {
  beforeEach(() => {
    flakyBroken = true;
    window.addEventListener("error", swallowRecoverableErrors);
    return () => window.removeEventListener("error", swallowRecoverableErrors);
  });

  it("shows a retryable error instead of a blank screen", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(
      <MemoryRouter initialEntries={["/app/leads"]}>
        <RouteErrorBoundary inline>
          <Explodes message="kaboom" />
        </RouteErrorBoundary>
      </MemoryRouter>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Esta pantalla no se pudo mostrar");
    expect(screen.getByRole("heading", { level: 1 })).toHaveFocus();
    expect(screen.getByRole("link", { name: "Ir a la bandeja" })).toHaveAttribute("href", "/app/inbox");
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
  });

  it("explains a missing chunk after a deploy and offers to reload", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    sessionStorage.setItem("boxlead.chunk-reload", "1");
    render(
      <MemoryRouter>
        <RouteErrorBoundary>
          <Explodes message="Failed to fetch dynamically imported module: /assets/Leads.js" />
        </RouteErrorBoundary>
      </MemoryRouter>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Hay una versión nueva de BoxLead");
    expect(screen.getByRole("button", { name: "Recargar" })).toBeInTheDocument();
  });

  it("resets when the user retries", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(
      <MemoryRouter>
        <RouteErrorBoundary inline>
          <Flaky />
        </RouteErrorBoundary>
      </MemoryRouter>,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    flakyBroken = false;
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(screen.getByText("Todo bien")).toBeInTheDocument();
  });

  it("resets when the route changes", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(
      <MemoryRouter initialEntries={["/a"]}>
        <RouteErrorBoundary inline>
          <Routes>
            <Route path="/a" element={<Explodes message="a" />} />
            <Route path="/b" element={<p>Página B</p>} />
          </Routes>
        </RouteErrorBoundary>
      </MemoryRouter>,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("link", { name: "Ir a la bandeja" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
