import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Avatar } from "./Avatar";
import { hueOf, initialsOf } from "./initials";
import { Banner } from "./Banner";
import { CharCounter } from "./CharCounter";
import { counterTone } from "./charCount";
import { ChoiceGroup } from "./ChoiceGroup";
import { ConfirmDialog } from "./ConfirmDialog";
import { useToast } from "./toast";
import { ToastProvider } from "./ToastProvider";

describe("Avatar", () => {
  it.each([
    ["Martín Herrera", "MH"],
    ["sofi.decoraciones", "SD"],
    ["MARTINGOMEZ_82", "MA"],
    ["CAROLINA_PZ", "CP"],
    ["", "?"],
  ])("uses %s → %s", (name, initials) => {
    expect(initialsOf(name)).toBe(initials);
  });

  it("keeps the same color for the same name", () => {
    expect(hueOf("Carolina")).toBe(hueOf("Carolina"));
  });

  it("is decorative and shows the channel logo", () => {
    const { container } = render(<Avatar name="Ana" platform="MELI" />);
    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector(".avatar-platform svg")).not.toBeNull();
  });
});

describe("CharCounter", () => {
  it("warns near the limit and flags overflow", () => {
    expect(counterTone(100, 350)).toBe("ok");
    expect(counterTone(320, 350)).toBe("near");
    expect(counterTone(351, 350)).toBe("over");
    render(<CharCounter length={351} max={350} />);
    expect(screen.getByText(/supera el máximo/)).toBeInTheDocument();
  });
});

describe("Banner", () => {
  it("announces errors as alerts and the rest as status", () => {
    render(
      <>
        <Banner tone="danger" title="Falló" />
        <Banner tone="info" title="Dato" />
      </>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Falló");
    expect(screen.getByRole("status")).toHaveTextContent("Dato");
  });
});

describe("ChoiceGroup", () => {
  it("marks the selected choice and reports changes", async () => {
    const onChange = vi.fn();
    render(
      <ChoiceGroup
        label="Canal"
        value="all"
        onChange={onChange}
        choices={[
          { value: "all", label: "Todos" },
          { value: "MELI", label: "MercadoLibre", count: 3 },
        ]}
      />,
    );
    expect(screen.getByRole("button", { name: "Todos" })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(screen.getByRole("button", { name: /MercadoLibre/ }));
    expect(onChange).toHaveBeenCalledWith("MELI");
    expect(screen.getByRole("button", { name: /^MercadoLibre\s*,\s*3 sin leer$/ })).toBeInTheDocument();
  });
});

describe("ConfirmDialog", () => {
  it("confirms and cancels", async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog open title="¿Desconectar?" confirmLabel="Desconectar" tone="danger" onConfirm={onConfirm} onCancel={onCancel} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Desconectar", hidden: true }));
    await userEvent.click(screen.getByRole("button", { name: "Cancelar", hidden: true }));
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onCancel).toHaveBeenCalledOnce();
  });
});

describe("Toasts", () => {
  function Trigger() {
    const toast = useToast();
    return <button onClick={() => toast({ message: "Cuenta conectada" })}>Avisar</button>;
  }

  it("shows a message and hides it after a while", () => {
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Avisar" }));
    expect(screen.getByRole("status")).toHaveTextContent("Cuenta conectada");
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.queryByRole("status")).toBeNull();
    vi.useRealTimers();
  });
});
