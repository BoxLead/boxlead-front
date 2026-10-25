import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ScrollRestoration } from "./ScrollRestoration";

function Back() {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate(-1)}>
      atrás
    </button>
  );
}

function Shell() {
  return (
    <MemoryRouter initialEntries={["/a"]}>
      <ScrollRestoration />
      <Routes>
        <Route
          path="/a"
          element={
            <p>
              A <Link to="/b">ir a B</Link> <Link to="/b#seccion">ir a sección</Link>
            </p>
          }
        />
        <Route
          path="/b"
          element={
            <p>
              B <Back /> <span id="seccion">sección</span>
            </p>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe("ScrollRestoration", () => {
  let scrollY = 0;
  const scrollTo = vi.fn((options: ScrollToOptions) => {
    scrollY = options.top ?? 0;
  });

  beforeEach(() => {
    scrollY = 0;
    scrollTo.mockClear();
    vi.stubGlobal("scrollTo", scrollTo);
    Object.defineProperty(window, "scrollY", { configurable: true, get: () => scrollY });
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("scrolls to the top on a new page and restores the position when going back", async () => {
    render(<Shell />);
    scrollY = 480;
    await userEvent.click(screen.getByRole("link", { name: "ir a B" }));
    expect(scrollTo).toHaveBeenLastCalledWith(expect.objectContaining({ top: 0 }));

    await act(async () => {
      await userEvent.click(screen.getByRole("button", { name: "atrás" }));
    });
    expect(scrollTo).toHaveBeenLastCalledWith(expect.objectContaining({ top: 480 }));
  });

  it("scrolls to the hash target when the link has one", async () => {
    render(<Shell />);
    await userEvent.click(screen.getByRole("link", { name: "ir a sección" }));
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it("takes over the browser scroll restoration", () => {
    Object.defineProperty(window.history, "scrollRestoration", { configurable: true, writable: true, value: "auto" });
    render(<Shell />);
    expect(window.history.scrollRestoration).toBe("manual");
  });
});
