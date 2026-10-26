import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { NotFound } from "./NotFound";

describe("NotFound", () => {
  it("offers the way back to the public site", () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { level: 1, name: "No encontramos esta página" })).toHaveFocus();
    expect(screen.getByRole("link", { name: "Ir al inicio" })).toHaveAttribute("href", "/");
  });

  it("offers the way back inside the app", () => {
    render(
      <MemoryRouter>
        <NotFound inApp />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: "Ir a la bandeja" })).toHaveAttribute("href", "/app/inbox");
    expect(screen.getByRole("link", { name: "Ver leads" })).toHaveAttribute("href", "/app/leads");
  });
});
