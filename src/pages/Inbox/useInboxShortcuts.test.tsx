import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef } from "react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { isTypingTarget, nextId, useInboxShortcuts } from "./useInboxShortcuts";

function Harness({ selectedId }: { selectedId: string | null }) {
  const searchRef = useRef<HTMLInputElement>(null);
  const location = useLocation();
  useInboxShortcuts({
    ids: ["a", "b", "c"],
    selectedId,
    linkFor: (id) => `/app/inbox?id=${id}`,
    backTo: "/app/inbox",
    searchRef,
  });
  return (
    <div>
      <input ref={searchRef} aria-label="Buscar" />
      <textarea aria-label="Responder" />
      <p data-testid="where">{`${location.pathname}${location.search}`}</p>
    </div>
  );
}

describe("nextId", () => {
  it("moves through the visible rows and stops at the ends", () => {
    expect(nextId(["a", "b"], null, 1)).toBe("a");
    expect(nextId(["a", "b"], "a", 1)).toBe("b");
    expect(nextId(["a", "b"], "b", 1)).toBeNull();
    expect(nextId(["a", "b"], "a", -1)).toBeNull();
    expect(nextId([], null, 1)).toBeNull();
  });

  it("knows when the user is typing", () => {
    expect(isTypingTarget(document.createElement("input"))).toBe(true);
    expect(isTypingTarget(document.createElement("div"))).toBe(false);
  });
});

describe("useInboxShortcuts", () => {
  it("navigates with j and k, focuses the search with slash and goes back with Escape", async () => {
    const { rerender } = render(
      <MemoryRouter initialEntries={["/app/inbox"]}>
        <Harness selectedId={null} />
      </MemoryRouter>,
    );
    await userEvent.keyboard("j");
    expect(screen.getByTestId("where")).toHaveTextContent("/app/inbox?id=a");
    rerender(
      <MemoryRouter initialEntries={["/app/inbox?id=b"]}>
        <Harness selectedId="b" />
      </MemoryRouter>,
    );
    await userEvent.keyboard("k");
    expect(screen.getByTestId("where")).toHaveTextContent("/app/inbox?id=a");
    await userEvent.keyboard("/");
    expect(screen.getByLabelText("Buscar")).toHaveFocus();
    await userEvent.keyboard("j");
    expect(screen.getByLabelText("Buscar")).toHaveValue("j");
    await userEvent.keyboard("{Escape}");
    expect(screen.getByLabelText("Buscar")).not.toHaveFocus();
    await userEvent.keyboard("{Escape}");
    expect(screen.getByTestId("where")).toHaveTextContent("/app/inbox");
  });

  it("ignores letters typed in the composer", async () => {
    render(
      <MemoryRouter initialEntries={["/app/inbox?id=a"]}>
        <Harness selectedId="a" />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByLabelText("Responder"));
    await userEvent.keyboard("jk");
    expect(screen.getByLabelText("Responder")).toHaveValue("jk");
    expect(screen.getByTestId("where")).toHaveTextContent("/app/inbox?id=a");
  });
});
