import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../../../../src/components/ui/ToastProvider";
import type { AdminRole } from "../../api/types";
import { SessionContext, type SessionValue } from "../../session/session";
import { json, mockFetch, type Reply } from "../../test/fetch";
import { PaymentsScreen } from "./PaymentsScreen";
import { RefundDialog } from "./RefundDialog";
import { SubscriptionsScreen } from "./SubscriptionsScreen";
import type { PaymentRow, SubscriptionRow } from "./types";

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
  providerFee: ars(435000),
  approvedAt: "2026-10-20T15:00:00Z",
  createdAt: "2026-10-20T15:00:00Z",
  invoice: null,
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
    renderAs(["FINANCE"], <RefundDialog payment={PAYMENT} open onClose={vi.fn()} onDone={onDone} />);
    return calls;
  }

  it("shows what is left and sends a total refund without amount", async () => {
    const onDone = vi.fn();
    const calls = renderRefund(onDone);
    const left = screen.getByText("Queda para reembolsar").closest("div");
    expect(left).toHaveTextContent("67.000,00");
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
    expect(JSON.parse(String(post?.init.body))).toEqual({ reason: "Pedido del cliente por mail" });
    expect(await screen.findByText("Pausamos la suscripción.")).toBeInTheDocument();
  });
});
