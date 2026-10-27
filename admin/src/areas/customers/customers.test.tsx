import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../../../../src/components/ui/ToastProvider";
import type { AdminRole } from "../../api/types";
import { SessionContext, type SessionValue } from "../../session/session";
import { json, mockFetch, type Reply } from "../../test/fetch";
import { CustomerDetailScreen } from "./CustomerDetailScreen";
import { CustomersScreen } from "./CustomersScreen";
import { OverviewScreen } from "./OverviewScreen";
import type { CustomerFile, Overview } from "./types";

const USER_ID = "0c000000-0000-4000-8000-000000000001";
const LATER = new Date(Date.now() + 30 * 60_000).toISOString();
const ars = (amountMinor: number) => ({ amountMinor, currency: "ARS" });

function session(roles: AdminRole[]): SessionValue {
  const noop = () => Promise.resolve();
  return {
    stage: {
      kind: "ready",
      me: {
        userId: "admin",
        email: "equipo@boxlead.app",
        roles,
        factorConfirmed: true,
        enrollmentOpenUntil: null,
        factorLockedUntil: null,
        adminSessionExpiresAt: LATER,
      },
    },
    connectionLost: false,
    reauthenticating: false,
    retry: noop,
    signIn: noop,
    confirmEnrollment: noop,
    openSession: noop,
    reauthenticate: noop,
    cancelReauthentication: () => undefined,
    signOut: noop,
  };
}

function renderAt(path: string, roles: AdminRole[], handler: (method: string, url: URL, body: unknown) => Reply) {
  const calls = mockFetch(handler);
  render(
    <SessionContext.Provider value={session(roles)}>
      <ToastProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/" element={<OverviewScreen />} />
            <Route path="/usuarios" element={<CustomersScreen />} />
            <Route path="/usuarios/:userId" element={<CustomerDetailScreen />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </SessionContext.Provider>,
  );
  return calls;
}

function dialogOf(title: string): HTMLElement {
  const dialog = screen.getByRole("heading", { name: title, hidden: true }).closest("dialog");
  if (!dialog) throw new Error(`No dialog ${title}`);
  return dialog;
}

const EMPTY_PAGE = { items: [], page: 0, size: 50, totalItems: 0 };

function overview(finance: boolean): Overview {
  return {
    month: "2026-10",
    users: { total: 24, newInMonth: 3 },
    subscriptions: { byStatus: { ACTIVE: 2, PAUSED: 1 }, byPlan: { STARTER: 2 } },
    demos: { active: 1 },
    payments: { approvedInMonth: 3, rejectedInMonth: 1 },
    revenue: finance
      ? [{ currency: "ARS", gross: ars(46400000), refunded: ars(4350000), providerFees: ars(3248000), net: ars(38802000) }]
      : null,
    commissions: { approvedUnpaid: finance ? [ars(1305000)] : null, accruedReleasable: finance ? [] : null },
  };
}

function file(): CustomerFile {
  return {
    id: USER_ID,
    email: "ana.gomez@example.com",
    name: "Ana Gómez",
    createdAt: "2026-06-01T15:00:00Z",
    billingProfile: null,
    entitlements: {
      enforced: true,
      access: "FULL",
      plan: { code: "STARTER", versionId: "v1", source: "SUBSCRIPTION" },
      period: { start: "2026-10-16T03:00:00Z", end: "2026-11-15T03:00:00Z" },
      limits: { AGENT_REPLIES_PER_PERIOD: 1000, AGENTS_MAX: 5, LLM_COST_CAP_MICROS: 5_000_000, AUTO_CATEGORIZE: 1 },
      usage: { AGENT_REPLIES: 412 },
      computedAt: "2026-10-26T12:00:00Z",
    },
    overrides: [
      {
        id: "o1",
        userId: USER_ID,
        key: "AGENTS_MAX",
        value: 5,
        expiresAt: null,
        reason: "Pidió dos agentes más",
        createdBy: "admin",
        createdAt: "2026-10-01T12:00:00Z",
        revokedAt: null,
        revokedBy: null,
      },
    ],
    subscription: {
      id: "s1",
      status: "ACTIVE",
      planVersionId: "v1",
      pendingPlanVersionId: null,
      price: { amountMinor: 6000, currency: "USD" },
      charge: ars(8700000),
      lastCheckoutStatus: null,
      providerSubscriptionId: "p1",
      providerStatus: "authorized",
      providerNextPaymentAt: null,
      currentPeriodStart: "2026-10-16T03:00:00Z",
      currentPeriodEnd: "2026-11-15T03:00:00Z",
      paidThrough: "2026-11-15T03:00:00Z",
      graceUntil: null,
      suspendedUntil: null,
      cancelAtPeriodEnd: false,
      disputed: false,
      canceledAt: null,
      cancelReason: null,
      createdAt: "2026-07-01T12:00:00Z",
    },
    payments: [
      {
        id: "pay1",
        providerPaymentId: "9001",
        status: "APPROVED",
        statusDetail: "accredited",
        amount: ars(8700000),
        refunded: ars(0),
        providerFee: ars(609000),
        approvedAt: "2026-10-16T12:00:00Z",
        createdAt: "2026-10-16T12:00:00Z",
        invoice: { id: "i1", status: "ISSUED", invoiceNumber: "0003-00000001" },
      },
    ],
    demo: null,
    attribution: null,
    resellerId: null,
  };
}

function detailHandler(method: string, url: URL): Reply {
  if (method === "GET" && url.pathname === `/admin/customers/${USER_ID}`) return json(200, file());
  if (method === "GET") return json(200, EMPTY_PAGE);
  return json(204);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("OverviewScreen", () => {
  it("shows the amounts only to finance", async () => {
    renderAt("/", ["FINANCE"], () => json(200, overview(true)));
    expect(await screen.findByRole("heading", { name: "Ingresos del mes" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: /464\.000,00/ })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: /388\.020,00/ })).toBeInTheDocument();
    expect(screen.getByText("Aprobadas sin liquidar")).toBeInTheDocument();
  });

  it("hides the amounts from support", async () => {
    renderAt("/", ["SUPPORT"], () => json(200, overview(false)));
    expect(await screen.findByText("Los ingresos y las comisiones los ven Finanzas y Dueño.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Ingresos del mes" })).not.toBeInTheDocument();
    expect(screen.getByText("24")).toBeInTheDocument();
  });

  it("asks for the month in the URL and shows an empty month", async () => {
    const calls = renderAt("/?month=2026-09", ["OWNER"], () =>
      json(200, {
        ...overview(true),
        month: "2026-09",
        users: { total: 0, newInMonth: 0 },
        subscriptions: { byStatus: {}, byPlan: {} },
        demos: { active: 0 },
        payments: { approvedInMonth: 0, rejectedInMonth: 0 },
      }),
    );
    expect(await screen.findByText("Todavía no hay nada para mostrar acá")).toBeInTheDocument();
    expect(calls[0].url.search).toBe("?month=2026-09");
  });

  it("shows the error and retries", async () => {
    let fail = true;
    renderAt("/", ["OWNER"], () => {
      if (fail) {
        fail = false;
        return json(500, { error: "boom", message: "boom" });
      }
      return json(200, overview(true));
    });
    expect(await screen.findByText("No pudimos cargar el inicio")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByRole("heading", { name: "Ingresos del mes" })).toBeInTheDocument();
  });
});

describe("CustomersScreen", () => {
  it("lists users with their plan and sends the filters", async () => {
    const calls = renderAt("/usuarios?status=ACTIVE", ["SUPPORT"], () =>
      json(200, {
        items: [
          {
            id: USER_ID,
            email: "ana.gomez@example.com",
            name: "Ana Gómez",
            legalName: null,
            createdAt: "2026-06-01T15:00:00Z",
            planCode: "STARTER",
            subscriptionStatus: "ACTIVE",
          },
        ],
        page: 0,
        size: 20,
        totalItems: 1,
      }),
    );
    expect(await screen.findByRole("link", { name: "ana.gomez@example.com" })).toHaveAttribute("href", `/usuarios/${USER_ID}`);
    expect(screen.getByRole("cell", { name: "Starter" })).toBeInTheDocument();
    expect(calls[0].url.search).toBe("?status=ACTIVE");
    await userEvent.selectOptions(screen.getByLabelText("Plan"), "DEMO");
    expect(calls.at(-1)?.url.search).toBe("?plan=DEMO&status=ACTIVE");
  });
});

describe("CustomerDetailScreen", () => {
  it("gives the owner every action and sends the reason", async () => {
    const calls = renderAt(`/usuarios/${USER_ID}`, ["OWNER"], detailHandler);
    expect(await screen.findByRole("heading", { name: "Suscripción" })).toBeInTheDocument();
    for (const name of [
      "Pausar",
      "Cancelar suscripción",
      "Otorgar Demo",
      "Asignar revendedor",
      "Ajustar agentes",
      "Quitar el ajuste de agentes",
    ]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
    expect(screen.getByText("412 de 1.000")).toBeInTheDocument();
    expect(screen.getByText("Emitida, 0003-00000001")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Pausar" }));
    const dialog = dialogOf("Pausar suscripción");
    expect(within(dialog).getByText(/87\.000,00 ARS por período/)).toBeInTheDocument();
    await userEvent.type(within(dialog).getByLabelText("Motivo"), "Pidió frenar el cobro por vacaciones");
    await userEvent.click(within(dialog).getByRole("button", { name: "Pausar", hidden: true }));
    const pause = calls.find((call) => call.method === "POST");
    expect(pause?.url.pathname).toBe(`/admin/customers/${USER_ID}/subscription/pause`);
    expect(JSON.parse(String(pause?.init.body))).toEqual({ reason: "Pidió frenar el cobro por vacaciones" });
    expect(await screen.findByText("La suscripción quedó pausada.")).toBeInTheDocument();
  });

  it("sends an override with its value", async () => {
    const calls = renderAt(`/usuarios/${USER_ID}`, ["OWNER"], detailHandler);
    await userEvent.click(await screen.findByRole("button", { name: "Ajustar tope de costo de IA del período" }));
    const dialog = dialogOf("Ajustar tope de costo de IA del período");
    expect(within(dialog).getByLabelText("Valor en USD")).toHaveValue(5);
    await userEvent.clear(within(dialog).getByLabelText("Valor en USD"));
    await userEvent.type(within(dialog).getByLabelText("Valor en USD"), "12.5");
    await userEvent.type(within(dialog).getByLabelText("Motivo"), "Cliente con mucho volumen este mes");
    await userEvent.click(within(dialog).getByRole("button", { name: "Guardar ajuste", hidden: true }));
    const put = calls.find((call) => call.method === "PUT");
    expect(put?.url.pathname).toBe(`/admin/customers/${USER_ID}/overrides/LLM_COST_CAP_MICROS`);
    expect(JSON.parse(String(put?.init.body))).toEqual({ value: 12_500_000, reason: "Cliente con mucho volumen este mes" });
  });

  it("gives support only the Demo actions and finance none", async () => {
    renderAt(`/usuarios/${USER_ID}`, ["SUPPORT"], detailHandler);
    expect(await screen.findByRole("button", { name: "Otorgar Demo" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pausar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ajustar agentes" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Asignar revendedor" })).not.toBeInTheDocument();
  });

  it("shows no action to finance", async () => {
    renderAt(`/usuarios/${USER_ID}`, ["FINANCE"], detailHandler);
    expect(await screen.findByRole("heading", { name: "Suscripción" })).toBeInTheDocument();
    expect(screen.queryAllByRole("button").filter((button) => button.closest(".customer-section"))).toEqual([]);
  });

  it("says when the user does not exist", async () => {
    renderAt(`/usuarios/${USER_ID}`, ["OWNER"], () => json(404, { error: "Not found", message: "User not found" }));
    expect(await screen.findByText("No encontramos este usuario")).toBeInTheDocument();
  });
});
