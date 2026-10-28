import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SessionProvider } from "../session/SessionProvider";
import { useSession } from "../session/session";
import { readyBackend, stubReload } from "../test/session";
import { AdminLayout } from "./AdminLayout";
import { ScreenBoundary } from "./ScreenBoundary";

const TITLE = "No pudimos mostrar esta pantalla";

afterEach(() => {
  vi.unstubAllGlobals();
});

function Broken(): never {
  throw new Error("render failed");
}

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
        <Route path="/pagos" element={<Broken />} />
        <Route path="*" element={<Where />} />
      </Route>
    </Routes>
  );
}

describe("ScreenBoundary", () => {
  it("renders the screen while nothing fails", () => {
    render(
      <ScreenBoundary>
        <h1>Pagos</h1>
      </ScreenBoundary>,
    );
    expect(screen.getByRole("heading", { name: "Pagos" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows the error with a reload when the screen throws", async () => {
    const onCaughtError = vi.fn();
    render(
      <ScreenBoundary>
        <Broken />
      </ScreenBoundary>,
      { onCaughtError },
    );
    const alert = screen.getByRole("alert");
    expect(within(alert).getByText(TITLE)).toBeInTheDocument();
    expect(within(alert).getByText("Puede que haya una versión nueva del backoffice. Recargá la página.")).toBeInTheDocument();
    expect(onCaughtError).toHaveBeenCalledWith(expect.objectContaining({ message: "render failed" }), expect.anything());
    const reload = stubReload();
    await userEvent.click(within(alert).getByRole("button", { name: "Recargar" }));
    expect(reload).toHaveBeenCalledOnce();
  });

  it("keeps the layout around the failed screen and resets on another route", async () => {
    readyBackend(["OWNER"]);
    const onCaughtError = vi.fn();
    render(
      <MemoryRouter initialEntries={["/pagos"]}>
        <SessionProvider>
          <Harness />
        </SessionProvider>
      </MemoryRouter>,
      { onCaughtError },
    );
    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText(TITLE)).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "Secciones" });
    expect(within(nav).getByRole("link", { name: "Pagos" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Salir" })).toBeEnabled();
    expect(onCaughtError).toHaveBeenCalledOnce();

    await userEvent.click(within(nav).getByRole("link", { name: "Usuarios" }));
    expect(screen.getByRole("heading", { level: 1, name: "/usuarios" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
