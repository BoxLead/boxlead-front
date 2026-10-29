import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../../../../src/components/ui/ToastProvider";
import type { AdminRole } from "../../api/types";
import { SessionContext, type SessionValue } from "../../session/session";
import { json, mockFetch, type Reply } from "../../test/fetch";
import { InvoiceDialog } from "./InvoiceDialog";
import { InvoicesScreen } from "./InvoicesScreen";
import { PaymentsScreen } from "./PaymentsScreen";
import { RefundDialog } from "./RefundDialog";
import { RefundsScreen } from "./RefundsScreen";
import { RetryRefundDialog } from "./RetryRefundDialog";
import { SubscriptionsScreen } from "./SubscriptionsScreen";
import type { InvoiceRow, PaymentRow, RefundRow, SubscriptionRow } from "./types";

const ars = (amountMinor: number) => ({ amountMinor, currency: "ARS" });

const PAYMENT: PaymentRow = {
  id: "9e000000-0000-4000-8000-000000000001",
  userId: "0c000000-0000-4000-8000-000000000001",
  email: "ana@example.com",
  subscriptionId: "5b000000-0000-4000-8000-000000000001",
  providerPaymentId: "1320000001",
  status: "PARTIALLY_REFUNDED",
  statusDetail: "partially_refunded",
  amount: ars(8700000),
  refunded: ars(2000000),
  refundable: ars(5700000),
  providerFee: ars(435000),
  approvedAt: "2026-10-20T15:00:00Z",
  createdAt: "2026-10-20T15:00:00Z",
  invoice: null,
  refundNeeded: false,
};

const UNANSWERED: RefundRow = {
  id: "7a000000-0000-4000-8000-000000000001",
  paymentId: PAYMENT.id,
  userId: PAYMENT.userId,
  amount: null,
  effectiveAmount: ars(6700000),
  status: "REQUESTED",
  providerRefundId: null,
  requestedBy: "a2",
  createdAt: "2026-10-21T15:00:00Z",
};

const IN_PROCESS: RefundRow = {
  ...UNANSWERED,
  id: "7a000000-0000-4000-8000-000000000002",
  amount: ars(1000000),
  effectiveAmount: ars(1000000),
  providerRefundId: "rf-2003",
};

const PENDING_INVOICE: InvoiceRow = {
  id: "1f000000-0000-4000-8000-000000000001",
  paymentId: PAYMENT.id,
  userId: PAYMENT.userId,
  status: "PENDING",
  amount: ars(8700000),
  invoiceNumber: null,
  issuedAt: null,
  issuedBy: null,
  voidedAt: null,
  voidedBy: null,
  receiver: { legalName: "Ana Pérez", taxIdType: "CUIT", taxId: "20123456786", vatCondition: "MONOTRIBUTO" },
  createdAt: "2026-10-20T15:00:00Z",
};

const ISSUED_INVOICE: InvoiceRow = {
  ...PENDING_INVOICE,
  id: "1f000000-0000-4000-8000-000000000002",
  status: "ISSUED",
  invoiceNumber: "0003-00000011",
  issuedAt: "2026-10-21T15:00:00Z",
  issuedBy: "a2",
};

const VOIDED_INVOICE: InvoiceRow = {
  ...ISSUED_INVOICE,
  id: "1f000000-0000-4000-8000-000000000003",
  status: "VOIDED",
  invoiceNumber: "0003-00000010",
  voidedAt: "2026-10-22T15:00:00Z",
  voidedBy: "a2",
};

const SUBSCRIPTION: SubscriptionRow = {
  id: "5b000000-0000-4000-8000-000000000001",
  userId: PAYMENT.userId,
  email: "ana@example.com",
  planCode: "STARTER",
  status: "ACTIVE",
  price: { amountMinor: 6000, currency: "USD" },
  charge: ars(8700000),
  currentPeriodEnd: "2026-11-20T15:00:00Z",
  paidThrough: "2026-11-20T15:00:00Z",
  graceUntil: null,
  suspendedUntil: null,
  cancelAtPeriodEnd: false,
  disputed: false,
  canceledAt: null,
  cancelReason: null,
  createdAt: "2026-09-20T15:00:00Z",
};

function session(roles: AdminRole[]): SessionValue {
  return {
    stage: {
      kind: "ready",
      me: {
        userId: "a1",
        email: "equipo@boxlead.app",
        roles,
        factorConfirmed: true,
        enrollmentOpenUntil: null,
        factorLockedUntil: null,
        adminSessionExpiresAt: null,
      },
    },
    connectionLost: false,
    reauthenticating: false,
    retry: vi.fn(),
    signIn: vi.fn(),
    confirmEnrollment: vi.fn(),
    openSession: vi.fn(),
    reauthenticate: vi.fn(),
    cancelReauthentication: vi.fn(),
    signOut: vi.fn(),
  };
}

function renderAs(roles: AdminRole[], ui: ReactNode, path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SessionContext.Provider value={session(roles)}>
        <ToastProvider>{ui}</ToastProvider>
      </SessionContext.Provider>
    </MemoryRouter>,
  );
}

function page<T>(items: T[]): Reply {
  return json(200, { items, page: 0, size: 50, totalItems: items.length });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("refund dialog", () => {
  function renderRefund(onDone = vi.fn()) {
    const calls = mockFetch(() => json(201, { id: "r1", paymentId: PAYMENT.id, amount: null, status: "APPROVED", providerRefundId: "rf", createdAt: "" }));
    renderAs(["FINANCE"], <RefundDialog payment={PAYMENT} open onClose={vi.fn()} onDone={onDone} onAsked={vi.fn()} />);
    return calls;
  }

  it("shows what core says is left and sends a total refund without amount", async () => {
    const onDone = vi.fn();
    const calls = renderRefund(onDone);
    const left = screen.getByText("Queda para reembolsar").closest("div");
    expect(left).toHaveTextContent("57.000,00");
    expect(screen.getByText("Pedido y sin acreditar").closest("div")).toHaveTextContent("10.000,00");
    expect(screen.getByText("ARS")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Motivo"), "El cliente pidió la baja");
    await userEvent.click(screen.getByRole("button", { name: "Reembolsar", hidden: true }));
    expect(calls[0].url.pathname).toBe(`/admin/payments/${PAYMENT.id}/refunds`);
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ reason: "El cliente pidió la baja" });
    expect(onDone).toHaveBeenCalled();
  });

  it("sends a partial refund in minor units and refuses more than what is left", async () => {
    const calls = renderRefund();
    await userEvent.click(screen.getByRole("button", { name: "Parcial", hidden: true }));
    const field = screen.getByLabelText("Monto a reembolsar en ARS");
    await userEvent.type(field, "70.000");
    await userEvent.type(screen.getByLabelText("Motivo"), "Descuento acordado con el cliente");
    await userEvent.click(screen.getByRole("button", { name: "Reembolsar", hidden: true }));
    expect(await screen.findByText("Revisá el monto a reembolsar.")).toBeInTheDocument();
    expect(calls).toHaveLength(0);
    await userEvent.clear(field);
    await userEvent.type(field, "1.000,50");
    await userEvent.click(screen.getByRole("button", { name: "Reembolsar", hidden: true }));
    expect(JSON.parse(String(calls[0].init.body))).toEqual({
      amount: { amountMinor: 100050, currency: "ARS" },
      reason: "Descuento acordado con el cliente",
    });
  });

  it("keeps the dialog open with the reason when core says the refund exceeds what is left", async () => {
    mockFetch(() => json(422, { error: "Unprocessable", message: "exceeds", code: "REFUND_EXCEEDS_PAYMENT" }));
    const onDone = vi.fn();
    renderAs(["FINANCE"], <RefundDialog payment={PAYMENT} open onClose={vi.fn()} onDone={onDone} onAsked={vi.fn()} />);
    await userEvent.type(screen.getByLabelText("Motivo"), "El cliente pidió la baja");
    await userEvent.click(screen.getByRole("button", { name: "Reembolsar", hidden: true }));
    expect(await screen.findByText("El reembolso supera lo que queda del pago.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Reembolsar pago", hidden: true })).toBeInTheDocument();
    expect(screen.getByLabelText("Motivo")).toHaveValue("El cliente pidió la baja");
    expect(onDone).not.toHaveBeenCalled();
  });
});

describe("payments screen", () => {
  it("offers a refund only when core leaves something to refund and shows what is in progress", async () => {
    const waiting: PaymentRow = { ...PAYMENT, id: "9e000000-0000-4000-8000-000000000002", status: "APPROVED", refunded: ars(0), refundable: ars(0) };
    mockFetch(() => page([PAYMENT, waiting]));
    renderAs(["FINANCE"], <PaymentsScreen />, "/pagos");
    expect(await screen.findByRole("button", { name: /Reembolsar el pago 9e000000/ })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Reembolsar el pago/ })).toHaveLength(1);
    const rows = screen.getAllByRole("row");
    expect(rows[1]).toHaveTextContent("Reembolsado $ 20.000,00");
    expect(rows[1]).toHaveTextContent("Pedido y sin acreditar $ 10.000,00");
    expect(rows[2]).toHaveTextContent("Pedido y sin acreditar $ 87.000,00");
    expect(within(rows[2]).queryByRole("button")).not.toBeInTheDocument();
  });

  it.each([
    [{ status: "REQUESTED", providerRefundId: "rf-9" }, "Mercado Pago está procesando el reembolso. Vas a ver la respuesta en Reembolsos."],
    [{ status: "REQUESTED", providerRefundId: null }, "Pedimos el reembolso y Mercado Pago todavía no respondió. Reintentalo desde Reembolsos."],
    [{ status: "REJECTED", providerRefundId: "rf-9" }, "Mercado Pago rechazó el reembolso. No se devolvió plata."],
  ])("tells what Mercado Pago answered to the refund %o", async (answer, message) => {
    mockFetch((method) =>
      method === "POST" ? json(201, { id: "r1", paymentId: PAYMENT.id, amount: null, createdAt: "", ...answer }) : page([PAYMENT]),
    );
    renderAs(["FINANCE"], <PaymentsScreen />, "/pagos");
    await userEvent.click(await screen.findByRole("button", { name: /Reembolsar el pago 9e000000/ }));
    await userEvent.type(screen.getByLabelText("Motivo"), "El cliente pidió la baja");
    await userEvent.click(screen.getByRole("button", { name: "Reembolsar", hidden: true }));
    expect(await screen.findByText(message)).toBeInTheDocument();
  });

  it.each([
    ["CANCELED", "Mercado Pago aprobó el reembolso. La suscripción quedó cancelada."],
    ["FAILED", /Mercado Pago no confirmó la cancelación de la suscripción, así que sigue viva y puede volver a cobrar\. La tiene que cancelar un Dueño desde Suscripciones\./],
  ] as const)("tells what happened to the subscription after a refund that closes it (%s)", async (subscriptionCancellation, message) => {
    mockFetch((method) =>
      method === "POST"
        ? json(201, { id: "r1", paymentId: PAYMENT.id, amount: null, createdAt: "", status: "APPROVED", providerRefundId: "rf", subscriptionCancellation })
        : page([PAYMENT]),
    );
    renderAs(["FINANCE"], <PaymentsScreen />, "/pagos");
    await userEvent.click(await screen.findByRole("button", { name: /Reembolsar el pago 9e000000/ }));
    await userEvent.type(screen.getByLabelText("Motivo"), "El cliente pidió la baja");
    await userEvent.click(screen.getByRole("button", { name: "Reembolsar", hidden: true }));
    expect(await screen.findByText(message)).toBeInTheDocument();
  });

  it("marks an approved payment that has to be given back", async () => {
    mockFetch(() => page([{ ...PAYMENT, status: "APPROVED", refunded: ars(0), refundNeeded: true }]));
    renderAs(["FINANCE"], <PaymentsScreen />, "/pagos");
    const row = (await screen.findAllByRole("row"))[1];
    expect(row).toHaveTextContent("Para devolver");
    expect(within(row).getByTitle("Se cobró con la suscripción ya cancelada")).toBeInTheDocument();
  });

  it("closes the dialog, says the refund stays asked for and reloads when Mercado Pago does not answer", async () => {
    const asked: PaymentRow = { ...PAYMENT, refundable: ars(5630000) };
    let posted = false;
    const calls = mockFetch((method) => {
      if (method !== "POST") return page([posted ? asked : PAYMENT]);
      posted = true;
      return json(502, { error: "Bad gateway", message: "down", code: "PROVIDER_UNAVAILABLE" });
    });
    renderAs(["FINANCE"], <PaymentsScreen />, "/pagos");
    await userEvent.click(await screen.findByRole("button", { name: /Reembolsar el pago 9e000000/ }));
    await userEvent.click(screen.getByRole("button", { name: "Parcial", hidden: true }));
    await userEvent.type(screen.getByLabelText("Monto a reembolsar en ARS"), "700");
    await userEvent.type(screen.getByLabelText("Motivo"), "El cliente pidió la baja");
    await userEvent.click(screen.getByRole("button", { name: "Reembolsar", hidden: true }));
    expect(await screen.findByText("Mercado Pago no respondió. Quedó pedido, reintentalo desde Reembolsos en unos minutos.")).toBeInTheDocument();
    await vi.waitFor(() => expect(screen.queryByLabelText("Motivo")).not.toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Reembolsar", hidden: true })).not.toBeInTheDocument();
    await vi.waitFor(() => expect(calls.filter((call) => call.method === "GET")).toHaveLength(2));
    expect(calls.filter((call) => call.method === "POST")).toHaveLength(1);
    await userEvent.click(await screen.findByRole("button", { name: /Reembolsar el pago 9e000000/ }));
    expect(screen.getByText("Queda para reembolsar").closest("div")).toHaveTextContent("56.300,00");
  });

  it("closes the dialog without a second chance when core fails and the refund may have been asked for", async () => {
    const calls = mockFetch((method) => (method === "POST" ? json(504, { error: "Gateway timeout" }) : page([PAYMENT])));
    renderAs(["FINANCE"], <PaymentsScreen />, "/pagos");
    await userEvent.click(await screen.findByRole("button", { name: /Reembolsar el pago 9e000000/ }));
    await userEvent.type(screen.getByLabelText("Motivo"), "El cliente pidió la baja");
    await userEvent.click(screen.getByRole("button", { name: "Reembolsar", hidden: true }));
    expect(await screen.findByText("No sabemos si el reembolso quedó pedido. Revisalo en Reembolsos antes de pedirlo de nuevo.")).toBeInTheDocument();
    await vi.waitFor(() => expect(screen.queryByLabelText("Motivo")).not.toBeInTheDocument());
    await vi.waitFor(() => expect(calls.filter((call) => call.method === "GET")).toHaveLength(2));
    expect(calls.filter((call) => call.method === "POST")).toHaveLength(1);
  });

  it("reloads the list when the refund dialog closes after core refused the amount", async () => {
    const calls = mockFetch((method) =>
      method === "POST" ? json(422, { error: "Unprocessable", message: "exceeds", code: "REFUND_EXCEEDS_PAYMENT" }) : page([PAYMENT]),
    );
    renderAs(["FINANCE"], <PaymentsScreen />, "/pagos");
    await userEvent.click(await screen.findByRole("button", { name: /Reembolsar el pago 9e000000/ }));
    await userEvent.type(screen.getByLabelText("Motivo"), "El cliente pidió la baja");
    await userEvent.click(screen.getByRole("button", { name: "Reembolsar", hidden: true }));
    expect(await screen.findByText("El reembolso supera lo que queda del pago.")).toBeInTheDocument();
    const loads = calls.filter((call) => call.method === "GET").length;
    await userEvent.click(screen.getByRole("button", { name: "Cancelar", hidden: true }));
    await vi.waitFor(() => expect(calls.filter((call) => call.method === "GET").length).toBe(loads + 1));
  });
});

describe("refunds screen", () => {
  it("offers a retry only for a refund Mercado Pago never answered and names the one it is processing", async () => {
    mockFetch(() => page([UNANSWERED, IN_PROCESS]));
    renderAs(["FINANCE"], <RefundsScreen />, "/reembolsos");
    const rows = await screen.findAllByRole("row");
    const unanswered = rows.find((row) => row.textContent?.includes("Sin respuesta"));
    const inProcess = rows.find((row) => /En proceso\s*en Mercado Pago/.test(row.textContent ?? ""));
    if (!unanswered || !inProcess) throw new Error("missing rows");
    expect(within(unanswered).getByRole("button", { name: /Reintentar el reembolso 7a000000/ })).toBeInTheDocument();
    expect(unanswered).toHaveTextContent("$ 67.000,00ARS");
    expect(unanswered).toHaveTextContent("Lo que quedaba del pago");
    expect(within(inProcess).queryByRole("button", { name: /Reintentar/ })).not.toBeInTheDocument();
    expect(inProcess).toHaveTextContent("$ 10.000,00ARS");
  });

  it("tells when Mercado Pago is processing the retry and reloads the list", async () => {
    const calls = mockFetch((method) =>
      method === "POST"
        ? json(200, { id: UNANSWERED.id, paymentId: PAYMENT.id, amount: null, status: "REQUESTED", providerRefundId: "rf-9", createdAt: "" })
        : page([UNANSWERED]),
    );
    renderAs(["FINANCE"], <RefundsScreen />, "/reembolsos");
    await userEvent.click(await screen.findByRole("button", { name: /Reintentar el reembolso/ }));
    await userEvent.type(screen.getByLabelText("Motivo"), "Mercado Pago no contestó ayer");
    await userEvent.click(screen.getByRole("button", { name: "Reintentar", hidden: true }));
    expect(await screen.findByText("Lo mandamos de nuevo y Mercado Pago lo está procesando.")).toBeInTheDocument();
    expect(calls.filter((call) => call.method === "GET")).toHaveLength(2);
  });

  it("warns after a retry that the subscription could not be canceled", async () => {
    mockFetch((method) =>
      method === "POST"
        ? json(200, { id: UNANSWERED.id, paymentId: PAYMENT.id, amount: null, status: "APPROVED", providerRefundId: "rf-9", createdAt: "", subscriptionCancellation: "FAILED" })
        : page([UNANSWERED]),
    );
    renderAs(["FINANCE"], <RefundsScreen />, "/reembolsos");
    await userEvent.click(await screen.findByRole("button", { name: /Reintentar el reembolso/ }));
    await userEvent.type(screen.getByLabelText("Motivo"), "Mercado Pago no contestó ayer");
    await userEvent.click(screen.getByRole("button", { name: "Reintentar", hidden: true }));
    expect(await screen.findByText(/^Mercado Pago aprobó el reembolso\. Mercado Pago no confirmó la cancelación/)).toBeInTheDocument();
  });

  it("reloads the list when the retry finds the refund already answered", async () => {
    const calls = mockFetch((method) =>
      method === "POST" ? json(409, { error: "Conflict", message: "answered", code: "REFUND_ALREADY_ANSWERED" }) : page([UNANSWERED]),
    );
    renderAs(["FINANCE"], <RefundsScreen />, "/reembolsos");
    await userEvent.click(await screen.findByRole("button", { name: /Reintentar el reembolso/ }));
    await userEvent.type(screen.getByLabelText("Motivo"), "Mercado Pago no contestó ayer");
    await userEvent.click(screen.getByRole("button", { name: "Reintentar", hidden: true }));
    expect(await screen.findByText(/Mercado Pago ya respondió este reembolso/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Cancelar", hidden: true }));
    await vi.waitFor(() => expect(calls.filter((call) => call.method === "GET")).toHaveLength(2));
  });
});

describe("retry refund dialog", () => {
  it("shows what the refund is worth without asking for the payments of the user", async () => {
    const calls = mockFetch(() => json(200, { id: UNANSWERED.id, paymentId: PAYMENT.id, amount: null, status: "APPROVED", providerRefundId: "rf-9", createdAt: "" }));
    const onDone = vi.fn();
    renderAs(["FINANCE"], <RetryRefundDialog refund={UNANSWERED} open onClose={vi.fn()} onDone={onDone} />);
    expect(screen.getByText(/67\.000,00/)).toBeInTheDocument();
    expect(screen.getByText(/Es un reembolso total/)).toBeInTheDocument();
    expect(calls).toHaveLength(0);
    await userEvent.type(screen.getByLabelText("Motivo"), "Mercado Pago no contestó ayer");
    await userEvent.click(screen.getByRole("button", { name: "Reintentar", hidden: true }));
    expect(calls).toHaveLength(1);
    expect(calls[0].url.pathname).toBe(`/admin/refunds/${UNANSWERED.id}/retry`);
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ reason: "Mercado Pago no contestó ayer" });
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ status: "APPROVED" }));
  });
});

describe("invoices screen", () => {
  it("issues a pending invoice, voids only an issued one and says the list goes from oldest to newest", async () => {
    mockFetch(() => page([PENDING_INVOICE, ISSUED_INVOICE, VOIDED_INVOICE]));
    renderAs(["FINANCE"], <InvoicesScreen />, "/facturas");
    const rows = await screen.findAllByRole("row");
    const [pending, issued, voided] = rows.slice(1);
    expect(within(pending).getByRole("button", { name: /Marcar emitida/ })).toBeInTheDocument();
    expect(within(pending).queryByRole("button", { name: /Anular/ })).not.toBeInTheDocument();
    expect(within(issued).getByRole("button", { name: "Anular la factura 0003-00000011" })).toBeInTheDocument();
    expect(within(issued).queryByRole("button", { name: /Marcar emitida/ })).not.toBeInTheDocument();
    expect(within(voided).queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText(/de la más vieja a la más nueva/)).toBeInTheDocument();
  });

  it("reloads the list when core says the invoice is not issued anymore", async () => {
    const calls = mockFetch((method) =>
      method === "POST" ? json(409, { error: "Conflict", message: "not issued", code: "INVOICE_NOT_ISSUED" }) : page([ISSUED_INVOICE]),
    );
    renderAs(["FINANCE"], <InvoicesScreen />, "/facturas");
    await userEvent.click(await screen.findByRole("button", { name: "Anular la factura 0003-00000011" }));
    await userEvent.type(screen.getByLabelText("Motivo"), "Se emitió con el CUIT equivocado");
    await userEvent.click(screen.getByRole("button", { name: "Anular factura", hidden: true }));
    expect(await screen.findByText("Solo se puede anular una factura emitida. Recargá para ver su estado.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Cancelar", hidden: true }));
    await vi.waitFor(() => expect(calls.filter((call) => call.method === "GET")).toHaveLength(2));
  });
});

describe("invoice dialog", () => {
  it("voids an issued invoice saying it does not go back", async () => {
    const calls = mockFetch(() => json(200, { ...ISSUED_INVOICE, status: "VOIDED" }));
    const onDone = vi.fn();
    renderAs(["FINANCE"], <InvoiceDialog invoice={ISSUED_INVOICE} action="void" open today="2026-10-27" onClose={vi.fn()} onDone={onDone} />);
    expect(screen.getByText(/0003-00000011 queda anulada en BoxLead y no vuelve atrás/)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Motivo"), "Se emitió con el CUIT equivocado");
    await userEvent.click(screen.getByRole("button", { name: "Anular factura", hidden: true }));
    expect(calls[0].url.pathname).toBe(`/admin/invoices/${ISSUED_INVOICE.id}/voided`);
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ reason: "Se emitió con el CUIT equivocado" });
    expect(onDone).toHaveBeenCalled();
  });

  it("asks for the number before marking an invoice issued and sends the date in Buenos Aires", async () => {
    const calls = mockFetch(() => json(200, ISSUED_INVOICE));
    renderAs(["FINANCE"], <InvoiceDialog invoice={PENDING_INVOICE} action="issue" open today="2026-10-27" onClose={vi.fn()} onDone={vi.fn()} />);
    await userEvent.type(screen.getByLabelText("Motivo"), "Factura emitida en ARCA hoy");
    await userEvent.click(screen.getByRole("button", { name: "Marcar emitida", hidden: true }));
    expect(await screen.findAllByText("Ingresá el número de la factura.")).not.toHaveLength(0);
    expect(calls).toHaveLength(0);
    await userEvent.type(screen.getByLabelText("Número de factura"), "0003-00000020");
    await userEvent.type(screen.getByLabelText("Fecha de emisión"), "2026-10-26");
    await userEvent.click(screen.getByRole("button", { name: "Marcar emitida", hidden: true }));
    expect(JSON.parse(String(calls[0].init.body))).toEqual({
      invoiceNumber: "0003-00000020",
      issuedAt: "2026-10-26T00:00:00-03:00",
      reason: "Factura emitida en ARCA hoy",
    });
  });
});

describe("buttons by role", () => {
  it("lets only finance refund a payment", async () => {
    mockFetch(() => page([PAYMENT]));
    renderAs(["SUPPORT"], <PaymentsScreen />, "/pagos");
    expect(await screen.findByRole("cell", { name: /ana@example.com/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Reembolsar/ })).not.toBeInTheDocument();
  });

  it("shows the refund button to finance", async () => {
    mockFetch(() => page([PAYMENT]));
    renderAs(["FINANCE"], <PaymentsScreen />, "/pagos");
    expect(await screen.findByRole("button", { name: /Reembolsar el pago 9e000000/ })).toBeInTheDocument();
  });

  it("lets only an owner pause or cancel a subscription", async () => {
    mockFetch(() => page([SUBSCRIPTION]));
    renderAs(["FINANCE", "SUPPORT"], <SubscriptionsScreen />, "/suscripciones");
    expect(await screen.findByText("Renueva el 20 nov 2026")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Pausar/ })).not.toBeInTheDocument();
  });

  it("sends the reason to pause the live subscription of the user", async () => {
    const calls = mockFetch((method) => (method === "POST" ? json(204) : page([SUBSCRIPTION])));
    renderAs(["OWNER"], <SubscriptionsScreen />, "/suscripciones");
    const row = (await screen.findByText("Renueva el 20 nov 2026")).closest("tr");
    if (!row) throw new Error("missing row");
    expect(within(row).getByRole("button", { name: /Cancelar la suscripción/ })).toBeInTheDocument();
    await userEvent.click(within(row).getByRole("button", { name: /Pausar la suscripción/ }));
    await userEvent.type(screen.getByLabelText("Motivo"), "Pedido del cliente por mail");
    await userEvent.click(screen.getByRole("button", { name: "Pausar", hidden: true }));
    const post = calls.find((call) => call.method === "POST");
    expect(post?.url.pathname).toBe(`/admin/customers/${SUBSCRIPTION.userId}/subscription/pause`);
    expect(JSON.parse(String(post?.init.body))).toEqual({ reason: "Pedido del cliente por mail", expectedSubscriptionId: SUBSCRIPTION.id });
    expect(await screen.findByText("Pausamos la suscripción.")).toBeInTheDocument();
  });

  it("offers only paid plans in the plan filter and shows the fee as a fee, not as money that moves", async () => {
    mockFetch(() => page([SUBSCRIPTION]));
    renderAs(["OWNER"], <SubscriptionsScreen />, "/suscripciones");
    const row = (await screen.findByText("Renueva el 20 nov 2026")).closest("tr");
    if (!row) throw new Error("missing row");
    const plans = within(screen.getByLabelText("Plan", { selector: "select" })).getAllByRole("option").map((option) => option.textContent);
    expect(plans).not.toContain("Demo");
    expect(plans).toContain("Starter");
    await userEvent.click(within(row).getByRole("button", { name: /Cancelar la suscripción/ }));
    expect(screen.getByText(/no se le vuelve a cobrar la cuota de \$\s87\.000,00 ARS/)).toBeInTheDocument();
    expect(screen.queryByText("Monto")).not.toBeInTheDocument();
  });

  it("explains that the subscription changed and reloads the list on close", async () => {
    const calls = mockFetch((method) =>
      method === "POST" ? json(409, { error: "Conflict", message: "changed", code: "SUBSCRIPTION_CHANGED" }) : page([SUBSCRIPTION]),
    );
    renderAs(["OWNER"], <SubscriptionsScreen />, "/suscripciones");
    const row = (await screen.findByText("Renueva el 20 nov 2026")).closest("tr");
    if (!row) throw new Error("missing row");
    await userEvent.click(within(row).getByRole("button", { name: /Cancelar la suscripción/ }));
    await userEvent.type(screen.getByLabelText("Motivo"), "Pedido del cliente por mail");
    await userEvent.click(screen.getByRole("button", { name: "Cancelar suscripción", hidden: true }));
    expect(await screen.findByText(/La suscripción de este cliente cambió desde que abriste la lista/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Cancelar", hidden: true }));
    await vi.waitFor(() => expect(calls.filter((call) => call.method === "GET")).toHaveLength(2));
  });
});
