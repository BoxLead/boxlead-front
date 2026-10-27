import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { formatDateTime, formatMonth, shiftMonth } from "../format";
import { DateText } from "./DateText";
import { Money } from "./Money";
import { MonthPicker } from "./MonthPicker";
import { StatCard } from "./StatCard";

describe("primitives", () => {
  it("formats money with the code only when asked", () => {
    const { rerender } = render(<Money money={{ amountMinor: 8700000, currency: "ARS" }} />);
    expect(screen.getByText("$ 87.000,00")).toBeInTheDocument();
    expect(screen.queryByText("ARS")).toBeNull();
    rerender(<Money money={{ amountMinor: 6000, currency: "USD" }} code />);
    expect(screen.getByText("US$ 60,00")).toBeInTheDocument();
    expect(screen.getByText("USD")).toBeInTheDocument();
  });

  it("writes every date the same way", () => {
    expect(formatDateTime("2026-10-21T12:33:00Z")).toBe("21 oct 2026, 09:33");
    render(<DateText value="2026-10-21T12:33:00Z" time />);
    expect(screen.getByText("21 oct 2026, 09:33")).toHaveAttribute("datetime", "2026-10-21T12:33:00Z");
    render(<DateText value={null} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("colours a delta by whether it is good news", () => {
    const { container, rerender } = render(<StatCard label="Usuarios" value="24" delta={{ value: 4, label: "que el mes pasado" }} />);
    expect(container.querySelector(".stat-delta-up")).not.toBeNull();
    expect(screen.getByText("+4")).toBeInTheDocument();
    rerender(<StatCard label="Rechazados" value="1" tone="danger" delta={{ value: 1, label: "más" }} />);
    expect(container.querySelector(".stat-delta-down")).not.toBeNull();
  });

  it("moves between months in Spanish without passing the limit", async () => {
    const onChange = vi.fn();
    render(<MonthPicker value="2026-10" max="2026-10" onChange={onChange} />);
    expect(screen.getByText("Octubre de 2026")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Mes siguiente|No hay un mes siguiente/ })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: /Mes anterior/ }));
    expect(onChange).toHaveBeenCalledWith("2026-09");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(formatMonth("2026-01")).toBe("enero de 2026");
  });
});
