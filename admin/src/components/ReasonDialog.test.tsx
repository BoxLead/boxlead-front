import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AdminApiError } from "../api/errors";
import { ReasonDialog } from "./ReasonDialog";

function renderDialog(onConfirm: (reason: string) => Promise<void>, onClose = vi.fn(), onSettled = vi.fn()) {
  render(
    <ReasonDialog
      open
      title="Reembolsar pago"
      confirmLabel="Reembolsar"
      tone="danger"
      amount={{ amountMinor: 1234500, currency: "ARS" }}
      onConfirm={onConfirm}
      onClose={onClose}
      onSettled={onSettled}
    >
      <p>Se devuelve el pago completo y se cancela la suscripción.</p>
    </ReasonDialog>,
  );
}

function dialog(): HTMLElement {
  const element = screen.getByRole("heading", { name: "Reembolsar pago", hidden: true }).closest("dialog");
  if (!element) throw new Error("No dialog");
  return element;
}

function pressEscape() {
  fireEvent(dialog(), new Event("cancel", { cancelable: true }));
}

function clickOutside() {
  fireEvent.pointerDown(dialog());
  fireEvent.click(dialog());
}

describe("ReasonDialog", () => {
  it("needs a reason of at least ten characters and sends it trimmed", async () => {
    const onConfirm = vi.fn(() => Promise.resolve());
    renderDialog(onConfirm);
    const confirm = screen.getByRole("button", { name: "Reembolsar", hidden: true });
    expect(screen.getByText("ARS")).toBeInTheDocument();
    expect(screen.getByText(/12\.345,00/)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Motivo"), "  corto ");
    expect(confirm).toBeDisabled();
    await userEvent.tab();
    expect(screen.getByText("El motivo necesita al menos 10 caracteres.")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Motivo"), "el cliente pidió la baja");
    expect(confirm).toBeEnabled();
    await userEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledWith("corto el cliente pidió la baja");
  });

  it("keeps the dialog open with the error when the action fails", async () => {
    renderDialog(() => Promise.reject(new AdminApiError("El reembolso supera lo que queda del pago.", 422, "REFUND_EXCEEDS_PAYMENT")));
    await userEvent.type(screen.getByLabelText("Motivo"), "Pedido del cliente por mail");
    await userEvent.click(screen.getByRole("button", { name: "Reembolsar", hidden: true }));
    expect(await screen.findByText("El reembolso supera lo que queda del pago.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reembolsar", hidden: true })).toBeEnabled();
  });

  it("ignores Escape and clicks outside while the action is in flight", async () => {
    let fail: (error: Error) => void = () => undefined;
    const onClose = vi.fn();
    const onSettled = vi.fn();
    const failure = new AdminApiError("El estado cambió y esta acción ya no aplica.", 409, null);
    renderDialog(() => new Promise<void>((_, reject) => (fail = reject)), onClose, onSettled);
    await userEvent.type(screen.getByLabelText("Motivo"), "Pedido del cliente por mail");
    await userEvent.click(screen.getByRole("button", { name: "Reembolsar", hidden: true }));
    expect(screen.getByRole("button", { name: "Guardando…", hidden: true })).toBeDisabled();
    pressEscape();
    clickOutside();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Cancelar", hidden: true })).toBeDisabled();
    fail(failure);
    expect(await screen.findByText("El estado cambió y esta acción ya no aplica.")).toBeInTheDocument();
    pressEscape();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSettled).toHaveBeenCalledWith(failure);
  });

  it("closes without reporting anything when nothing was tried", () => {
    const onClose = vi.fn();
    const onSettled = vi.fn();
    renderDialog(() => Promise.resolve(), onClose, onSettled);
    clickOutside();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSettled).not.toHaveBeenCalled();
  });
});
