import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAnimatedNumber } from "./useAnimatedNumber";

function Probe({ value }: { value: number }) {
  return <span>{Math.round(useAnimatedNumber(value, 400))}</span>;
}

describe("useAnimatedNumber", () => {
  let now = 0;
  let queue: FrameRequestCallback[] = [];

  beforeEach(() => {
    now = 0;
    queue = [];
    vi.spyOn(performance, "now").mockImplementation(() => now);
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => queue.push(callback));
    vi.stubGlobal("cancelAnimationFrame", () => undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function advance(ms: number) {
    now += ms;
    const callbacks = queue;
    queue = [];
    act(() => callbacks.forEach((callback) => callback(now)));
  }

  it("starts on the first value and eases toward a new one", () => {
    const { rerender } = render(<Probe value={100} />);
    expect(screen.getByText("100")).toBeInTheDocument();
    rerender(<Probe value={200} />);
    advance(200);
    const midway = Number(screen.getByText(/\d+/).textContent);
    expect(midway).toBeGreaterThan(150);
    expect(midway).toBeLessThan(200);
    advance(200);
    expect(screen.getByText("200")).toBeInTheDocument();
  });
});
