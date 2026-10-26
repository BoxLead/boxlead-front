import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AdminApiError } from "../api/errors";
import { ReasonDialog } from "./ReasonDialog";

function renderDialog(onConfirm: (reason: string) => Promise<void>) {
  render(
    <ReasonDialog
      open
      title="Reembolsar pago"
      confirmLabel="Reembolsar"
      tone="danger"
      amount={{ amountMinor: 1234500, currency: "ARS" }}
      onConfirm={onConfirm}
      onClose={vi.fn()}
    >
      <p>Se devuelve el pago completo y se cancela la suscripción.</p>
    </ReasonDialog>,
  );
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
});
