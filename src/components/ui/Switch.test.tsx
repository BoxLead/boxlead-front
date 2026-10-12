import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Switch } from "./Switch";

describe("Switch", () => {
  it("toggles and names itself", async () => {
    const onChange = vi.fn();
    render(<Switch label="Activar Ventas" checked={false} onChange={onChange} />);
    await userEvent.click(screen.getByRole("switch", { name: "Activar Ventas" }));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("can hide the visible label", () => {
    render(<Switch label="Activar Ventas" hideLabel checked onChange={vi.fn()} />);
    expect(screen.getByRole("switch", { name: "Activar Ventas" })).toBeChecked();
    expect(screen.queryByText("Activar Ventas")).toHaveClass("visually-hidden");
  });
});
