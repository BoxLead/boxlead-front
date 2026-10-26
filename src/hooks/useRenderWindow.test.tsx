import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { useRenderWindow } from "./useRenderWindow";

function List({ items, filter }: { items: string[]; filter: string }) {
  const { shown, remaining, showMore, sentinelRef } = useRenderWindow(items, filter, 3);
  return (
    <div>
      <ul>
        {shown.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      {remaining > 0 ? (
        <button ref={sentinelRef} onClick={showMore}>
          más ({remaining})
        </button>
      ) : null}
    </div>
  );
}

const ITEMS = ["a", "b", "c", "d", "e", "f", "g"];

describe("useRenderWindow", () => {
  it("renders the first step and grows on demand", async () => {
    render(<List items={ITEMS} filter="" />);
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByRole("button")).toHaveTextContent("más (4)");
    await userEvent.click(screen.getByRole("button"));
    expect(screen.getAllByRole("listitem")).toHaveLength(6);
    await userEvent.click(screen.getByRole("button"));
    expect(screen.getAllByRole("listitem")).toHaveLength(7);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("grows when the sentinel becomes visible and resets when the filter changes", async () => {
    let callback: IntersectionObserverCallback = () => undefined;
    const observe = vi.fn();
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(cb: IntersectionObserverCallback) {
          callback = cb;
        }
        observe = observe;
        disconnect = vi.fn();
      },
    );
    const { rerender } = render(<List items={ITEMS} filter="" />);
    expect(observe).toHaveBeenCalled();
    act(() => callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));
    expect(screen.getAllByRole("listitem")).toHaveLength(6);
    rerender(<List items={ITEMS} filter="x" />);
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    vi.unstubAllGlobals();
  });
});
