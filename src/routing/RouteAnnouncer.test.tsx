import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { RouteMeta } from "../seo/RouteMeta";
import { pageNameFrom } from "./pageName";
import { RouteAnnouncer } from "./RouteAnnouncer";

function PageA() {
  useDocumentTitle("Bandeja");
  return (
    <main>
      <h1>Bandeja</h1>
      <Link to="/b">ir a leads</Link>
    </main>
  );
}

function PageB() {
  useDocumentTitle("Leads");
  return (
    <main>
      <h1>Leads</h1>
    </main>
  );
}

describe("RouteAnnouncer", () => {
  it("strips the product suffix from the title", () => {
    expect(pageNameFrom("Leads · BoxLead")).toBe("Leads");
    expect(pageNameFrom("Otro")).toBe("Otro");
    expect(pageNameFrom("(3) Leads · BoxLead")).toBe("Leads");
  });

  it("announces the new page and moves the focus to its heading", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(
      <MemoryRouter initialEntries={["/a"]}>
        <RouteMeta />
        <RouteAnnouncer />
        <Routes>
          <Route path="/a" element={<PageA />} />
          <Route path="/b" element={<PageB />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByRole("status", { hidden: true })).toHaveTextContent("");

    await userEvent.click(screen.getByRole("link", { name: "ir a leads" }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(screen.getByRole("status", { hidden: true })).toHaveTextContent("Leads, página cargada");
    expect(screen.getByRole("heading", { level: 1, name: "Leads" })).toHaveFocus();
    vi.useRealTimers();
  });
});
