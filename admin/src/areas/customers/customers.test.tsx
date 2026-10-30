import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../../../../src/components/ui/ToastProvider";
import type { AdminRole } from "../../api/types";
import { ResellerDirectoryProvider } from "../../session/ResellerDirectoryProvider";
import { SessionContext, type SessionValue } from "../../session/session";
import { json, mockFetch, type Reply } from "../../test/fetch";
import { CustomerDetailScreen } from "./CustomerDetailScreen";
import { addDays, endOfDay, today } from "./dates";
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
      <ToastProvider closeLabel="Cerrar aviso">
        <ResellerDirectoryProvider>
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route path="/" element={<OverviewScreen />} />
              <Route path="/usuarios" element={<CustomersScreen />} />
              <Route path="/usuarios/:userId" element={<CustomerDetailScreen />} />
            </Routes>
          </MemoryRouter>
        </ResellerDirectoryProvider>
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
        refundable: ars(8700000),
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

  it("asks for the month in the URL and shows an empty month with zeros and its users at the end of that month", async () => {
    const calls = renderAt("/?month=2026-09", ["OWNER"], () =>
      json(200, {
        ...overview(true),
        month: "2026-09",
        users: { total: 0, newInMonth: 0 },
        subscriptions: { byStatus: {}, byPlan: {} },
        demos: { active: 0 },
        payments: { approvedInMonth: 0, rejectedInMonth: 0 },
        revenue: [],
        commissions: { approvedUnpaid: [ars(1305000)], accruedReleasable: [] },
      }),
    );
    const users = (await screen.findByText("Usuarios", { selector: ".stat-label" })).closest("article") as HTMLElement;
    expect(within(users).getByText("septiembre de 2026")).toBeInTheDocument();
    expect(within(users).queryByText("Hoy")).toBeNull();
    expect(within(users).getByText("0", { selector: ".stat-value" })).toBeInTheDocument();
    expect(screen.getByText("Todavía no hay suscripciones.")).toBeInTheDocument();
    expect(screen.getByText("No hubo cobros en este mes.")).toBeInTheDocument();
    expect(screen.getByText("Aprobadas sin liquidar")).toBeInTheDocument();
    expect(screen.queryByText("Todavía no hay nada para mostrar acá")).toBeNull();
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
            planSource: "SUBSCRIPTION",
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
    expect(screen.getByRole("searchbox", { name: "Buscar" })).toHaveAttribute("placeholder", "Email, nombre o id, distingue tildes");
    await userEvent.selectOptions(screen.getByLabelText("Plan"), "DEMO");
    expect(calls.at(-1)?.url.search).toBe("?plan=DEMO&status=ACTIVE");
  });
});

describe("team access", () => {
  const TEAM_FILE: Partial<CustomerFile> = {
    subscription: null,
    payments: [],
    overrides: [],
    entitlements: {
      ...file().entitlements,
      plan: { code: "BUSINESS", versionId: "v3", source: "TEAM" },
      limits: { AGENT_REPLIES_PER_PERIOD: 5000, AGENTS_MAX: 10, METRICS_HISTORY_DAYS: 180 },
    },
  };

  it("shows a team row as Equipo and filters by it", async () => {
    const calls = renderAt("/usuarios", ["SUPPORT"], () =>
      json(200, {
        items: [
          {
            id: USER_ID,
            email: "pablo@boxlead.app",
            name: "Pablo",
            legalName: null,
            createdAt: "2026-06-01T15:00:00Z",
            planCode: "BUSINESS",
            planSource: "TEAM",
            subscriptionStatus: null,
            hasPassword: true,
          },
        ],
        page: 0,
        size: 20,
        totalItems: 1,
      }),
    );
    expect(await screen.findByRole("cell", { name: "Equipo" })).toBeInTheDocument();
    expect(screen.queryByRole("cell", { name: "Business" })).toBeNull();
    await userEvent.selectOptions(screen.getByLabelText("Plan"), "TEAM");
    expect(calls.at(-1)?.url.search).toBe("?plan=TEAM");
  });

  it("explains in the detail that a team member uses BoxLead for free on the Business limits", async () => {
    renderAt(`/usuarios/${USER_ID}`, ["OWNER"], handlerWith(TEAM_FILE));
    const plan = await screen.findByRole("region", { name: "Plan" });
    expect(within(plan).getByText("Business")).toBeInTheDocument();
    expect(within(plan).getByText("Equipo")).toBeInTheDocument();
    expect(within(plan).getByText(/usa BoxLead sin pagar con los límites de Business/)).toBeInTheDocument();
    expect(screen.getByText("Es del equipo, así que rigen los límites de Business con sus ajustes.")).toBeInTheDocument();
  });

  it("shows the Demo metrics history that rules without a plan", async () => {
    renderAt(
      `/usuarios/${USER_ID}`,
      ["OWNER"],
      handlerWith({
        subscription: null,
        payments: [],
        overrides: [],
        entitlements: {
          ...file().entitlements,
          access: "RESTRICTED",
          plan: { code: null, versionId: null, source: "NONE" },
          limits: { AGENT_REPLIES_PER_PERIOD: 0, AGENTS_MAX: 0, METRICS_HISTORY_DAYS: 30 },
        },
      }),
    );
    const metrics = await screen.findByRole("row", { name: /Días de historial de métricas/ });
    expect(within(metrics).getByText("30")).toBeInTheDocument();
    expect(within(screen.getByRole("row", { name: /^Agentes/ })).getAllByRole("cell")[1]).toHaveTextContent("—");
  });
});

const DETAIL_PATH = `/admin/customers/${USER_ID}`;
const HOUR = 3_600_000;

function demoOf(endsAt: number): CustomerFile["demo"] {
  return {
    id: "d1",
    userId: USER_ID,
    invitationId: null,
    planVersionId: "v0",
    startsAt: new Date(endsAt - 14 * 24 * HOUR).toISOString(),
    endsAt: new Date(endsAt).toISOString(),
    revokedAt: null,
  };
}

function handlerWith(change: Partial<CustomerFile>, replies: Record<string, Reply> = {}) {
  return (method: string, url: URL): Reply => {
    if (method === "GET" && url.pathname === DETAIL_PATH) return json(200, { ...file(), ...change });
    if (method === "GET" && url.pathname === "/admin/resellers") {
      return json(200, {
        items: [
          { id: "r1", displayName: "Agencia Norte", status: "ACTIVE" },
          { id: "r2", displayName: "Estudio Delta", status: "ACTIVE" },
        ],
        page: 0,
        size: 50,
        totalItems: 2,
      });
    }
    if (method === "GET") return json(200, EMPTY_PAGE);
    return replies[`${method} ${url.pathname}`] ?? json(204);
  };
}

function detailLoads(calls: { method: string; url: URL }[]): number {
  return calls.filter((call) => call.method === "GET" && call.url.pathname === DETAIL_PATH).length;
}

async function confirmIn(title: string, button: string, reason = "Lo pidió el cliente por mail") {
  const dialog = dialogOf(title);
  await userEvent.type(within(dialog).getByLabelText("Motivo"), reason);
  await userEvent.click(within(dialog).getByRole("button", { name: button, hidden: true }));
}

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
    expect(JSON.parse(String(pause?.init.body))).toEqual({ reason: "Pidió frenar el cobro por vacaciones", expectedSubscriptionId: "s1" });
    expect(await screen.findByText("La suscripción quedó pausada.")).toBeInTheDocument();
  });

  it("says the cancellation stays asked for when Mercado Pago does not confirm it", async () => {
    renderAt(`/usuarios/${USER_ID}`, ["OWNER"], (method, url) =>
      method === "POST" ? json(502, { error: "Bad gateway", message: "down", code: "PROVIDER_UNAVAILABLE" }) : detailHandler(method, url),
    );
    await userEvent.click(await screen.findByRole("button", { name: "Cancelar suscripción" }));
    const dialog = dialogOf("Cancelar suscripción");
    await userEvent.type(within(dialog).getByLabelText("Motivo"), "Pidió la baja por teléfono");
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancelar suscripción", hidden: true }));
    expect(await screen.findByText("Mercado Pago no confirmó la baja a tiempo. Quedó pedida y se confirma sola en unos minutos.")).toBeInTheDocument();
  });

  it("reloads the user when the subscription changed under the open dialog", async () => {
    const calls = renderAt(`/usuarios/${USER_ID}`, ["OWNER"], (method, url) =>
      method === "POST" ? json(409, { error: "Conflict", message: "changed", code: "SUBSCRIPTION_CHANGED" }) : detailHandler(method, url),
    );
    await userEvent.click(await screen.findByRole("button", { name: "Cancelar suscripción" }));
    const dialog = dialogOf("Cancelar suscripción");
    await userEvent.type(within(dialog).getByLabelText("Motivo"), "Pidió la baja por teléfono");
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancelar suscripción", hidden: true }));
    expect(await within(dialog).findByText(/La suscripción de este cliente cambió/)).toBeInTheDocument();
    const loads = calls.filter((call) => call.method === "GET" && call.url.pathname === `/admin/customers/${USER_ID}`).length;
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancelar", hidden: true }));
    await vi.waitFor(() =>
      expect(calls.filter((call) => call.method === "GET" && call.url.pathname === `/admin/customers/${USER_ID}`).length).toBe(loads + 1),
    );
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

  it("grants a Demo with its days and loads the detail again before the notice", async () => {
    const calls = renderAt(`/usuarios/${USER_ID}`, ["SUPPORT"], handlerWith({ demo: null }));
    await userEvent.click(await screen.findByRole("button", { name: "Otorgar Demo" }));
    const loads = detailLoads(calls);
    await userEvent.type(within(dialogOf("Otorgar Demo")).getByLabelText("Días de Demo"), "10");
    await confirmIn("Otorgar Demo", "Otorgar Demo");
    const post = calls.find((call) => call.method === "POST");
    expect(post?.url.pathname).toBe(`${DETAIL_PATH}/demo`);
    expect(JSON.parse(String(post?.init.body))).toEqual({ demoDays: 10, reason: "Lo pidió el cliente por mail" });
    expect(await screen.findByText("Le otorgamos la Demo.")).toBeInTheDocument();
    expect(detailLoads(calls)).toBe(loads + 1);
  }, 15_000);

  it("extends a running Demo and says when it ends", async () => {
    const calls = renderAt(`/usuarios/${USER_ID}`, ["SUPPORT"], handlerWith({ demo: demoOf(Date.now() + 3 * 24 * HOUR) }));
    await userEvent.click(await screen.findByRole("button", { name: "Extender" }));
    const dialog = dialogOf("Extender Demo");
    expect(within(dialog).getByText(/^Termina el .+\. Pasa a terminar al final del día que elijas/)).toBeInTheDocument();
    const day = (within(dialog).getByLabelText("Nuevo fin") as HTMLInputElement).value;
    await confirmIn("Extender Demo", "Extender");
    const post = calls.find((call) => call.method === "POST");
    expect(post?.url.pathname).toBe(`${DETAIL_PATH}/demo/extend`);
    expect(JSON.parse(String(post?.init.body))).toEqual({ endsAt: new Date(`${day}T23:59:59-03:00`).toISOString(), reason: "Lo pidió el cliente por mail" });
    expect(await screen.findByText("Extendimos la Demo.")).toBeInTheDocument();
  }, 15_000);

  it("takes away a running Demo and says the access ends now", async () => {
    const calls = renderAt(`/usuarios/${USER_ID}`, ["SUPPORT"], handlerWith({ demo: demoOf(Date.now() + 3 * 24 * HOUR) }));
    await userEvent.click(await screen.findByRole("button", { name: "Quitar Demo" }));
    expect(within(dialogOf("Quitar Demo")).getByText(/La Demo termina ahora/)).toBeInTheDocument();
    await confirmIn("Quitar Demo", "Quitar Demo");
    const post = calls.find((call) => call.method === "POST");
    expect(post?.url.pathname).toBe(`${DETAIL_PATH}/demo/revoke`);
    expect(await screen.findByText("Le quitamos la Demo.")).toBeInTheDocument();
  }, 15_000);

  it("words the extend and the take away of a Demo that already ended", async () => {
    renderAt(`/usuarios/${USER_ID}`, ["SUPPORT"], handlerWith({ demo: demoOf(Date.now() - 2 * 24 * HOUR) }));
    await userEvent.click(await screen.findByRole("button", { name: "Extender" }));
    const extend = dialogOf("Extender Demo");
    expect(within(extend).getByText(/^Terminó el .+\. Vuelve a estar vigente desde ahora/)).toBeInTheDocument();
    expect(within(extend).queryByText(/^Termina el/)).toBeNull();
    await userEvent.click(within(extend).getByRole("button", { name: "Cancelar", hidden: true }));
    await userEvent.click(screen.getByRole("button", { name: "Quitar Demo" }));
    const revoke = dialogOf("Quitar Demo");
    expect(within(revoke).getByText("La Demo ya terminó, así que su acceso no cambia. Quitarla deja lugar para otorgarle otra.")).toBeInTheDocument();
    expect(within(revoke).queryByText(/La Demo termina ahora/)).toBeNull();
  });

  it("names the reseller in the summary the same way the attribution panel does", async () => {
    const attribution = { id: "a1", userId: USER_ID, resellerId: "r1", referralCodeId: "c1", source: "COOKIE" as const, sequence: 1, reason: null, createdAt: "2026-06-01T15:00:00Z" };
    const calls = renderAt(`/usuarios/${USER_ID}`, ["OWNER"], handlerWith({ attribution }));
    await vi.waitFor(() => expect(screen.getAllByText("Agencia Norte")).toHaveLength(2), { timeout: 5000 });
    for (const name of screen.getAllByText("Agencia Norte")) expect(name.closest("a")).toHaveAttribute("href", "/revendedores/r1");
    expect(screen.queryByText("Ver revendedor")).not.toBeInTheDocument();
    expect(calls.filter((call) => call.url.pathname === "/admin/resellers")).toHaveLength(1);
  });

  it("corrects the attribution, says where the commissions go and loads the detail again", async () => {
    const attribution = { id: "a1", userId: USER_ID, resellerId: "r1", referralCodeId: "c1", source: "COOKIE" as const, sequence: 1, reason: null, createdAt: "2026-06-01T15:00:00Z" };
    const calls = renderAt(`/usuarios/${USER_ID}`, ["OWNER"], handlerWith({ attribution }));
    await userEvent.click(await screen.findByRole("button", { name: "Corregir atribución" }));
    const dialog = dialogOf("Corregir atribución");
    expect(
      within(dialog).getByText(/Las comisiones ya generadas quedan con el revendedor anterior\. Las próximas van al nuevo\./),
    ).toBeInTheDocument();
    await userEvent.selectOptions(await within(dialog).findByLabelText("Revendedor"), "r2");
    const loads = detailLoads(calls);
    await confirmIn("Corregir atribución", "Corregir");
    const post = calls.find((call) => call.method === "POST");
    expect(post?.url.pathname).toBe(`${DETAIL_PATH}/attribution`);
    expect(JSON.parse(String(post?.init.body))).toEqual({ resellerId: "r2", reason: "Lo pidió el cliente por mail" });
    expect(await screen.findByText("Corregimos la atribución.")).toBeInTheDocument();
    expect(detailLoads(calls)).toBe(loads + 1);
  }, 15_000);

  it("shows a dash for the limits of a user without a plan except the ones adjusted", async () => {
    const entitlements = {
      ...file().entitlements,
      access: "RESTRICTED" as const,
      plan: { code: null, versionId: null, source: "NONE" as const },
      limits: { AGENT_REPLIES_PER_PERIOD: 0, AGENTS_MAX: 5, PLAYGROUND_RUNS_PER_HOUR: 0, LLM_COST_CAP_MICROS: 0, AUTO_CATEGORIZE: 0 },
    };
    renderAt(`/usuarios/${USER_ID}`, ["OWNER"], handlerWith({ entitlements, subscription: null }));
    const table = await screen.findByRole("table", { name: "Límites" });
    const rowOf = (label: string) => within(within(table).getByRole("cell", { name: label }).closest("tr") as HTMLElement);
    expect(rowOf("Respuestas del agente por período").getAllByRole("cell")[1]).toHaveTextContent("—");
    expect(rowOf("Categorización automática").getAllByRole("cell")[1]).toHaveTextContent("—");
    expect(rowOf("Agentes").getAllByRole("cell")[1]).toHaveTextContent("5");
    expect(within(table).queryByText(/playground/i)).toBeNull();
    expect(rowOf("Pruebas del agente por hora").getAllByRole("cell")[1]).toHaveTextContent("—");
    await userEvent.click(screen.getByRole("button", { name: "Ajustar respuestas del agente por período" }));
    const dialog = dialogOf("Ajustar respuestas del agente por período");
    expect(within(dialog).getByText(/Hoy no rige ningún valor porque no tiene plan/)).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Valor")).toHaveValue(null);
  });

  it("takes an override back with a reason and loads the detail again", async () => {
    const calls = renderAt(`/usuarios/${USER_ID}`, ["OWNER"], handlerWith({}));
    await userEvent.click(await screen.findByRole("button", { name: "Quitar el ajuste de agentes" }));
    expect(within(dialogOf("Quitar ajuste")).getByText("Agentes deja de valer 5 y vuelve al valor del plan.")).toBeInTheDocument();
    const loads = detailLoads(calls);
    await confirmIn("Quitar ajuste", "Quitar ajuste");
    const removed = calls.find((call) => call.method === "DELETE");
    expect(removed?.url.pathname).toBe(`${DETAIL_PATH}/overrides/AGENTS_MAX`);
    expect(JSON.parse(String(removed?.init.body))).toEqual({ reason: "Lo pidió el cliente por mail" });
    expect(await screen.findByText("Quitamos el ajuste.")).toBeInTheDocument();
    expect(detailLoads(calls)).toBe(loads + 1);
  }, 15_000);

  it("starts a switch adjustment on the value that rules today", async () => {
    const calls = renderAt(`/usuarios/${USER_ID}`, ["OWNER"], handlerWith({}));
    await userEvent.click(await screen.findByRole("button", { name: "Ajustar categorización automática" }));
    const dialog = dialogOf("Ajustar categorización automática");
    expect(within(dialog).getByLabelText("Valor")).toHaveValue("1");
    await confirmIn("Ajustar categorización automática", "Guardar ajuste");
    const put = calls.find((call) => call.method === "PUT");
    expect(JSON.parse(String(put?.init.body))).toEqual({ value: 1, reason: "Lo pidió el cliente por mail" });
  }, 15_000);

  it("links to every payment of the user in Pagos", async () => {
    renderAt(`/usuarios/${USER_ID}`, ["FINANCE"], handlerWith({}));
    expect(await screen.findByRole("link", { name: "Ver todos en Pagos" })).toHaveAttribute("href", `/pagos?userId=${USER_ID}`);
  });

  it("words the cancel by status and says an active plan ends right away", async () => {
    renderAt(`/usuarios/${USER_ID}`, ["OWNER"], handlerWith({}));
    await userEvent.click(await screen.findByRole("button", { name: "Cancelar suscripción" }));
    const active = dialogOf("Cancelar suscripción");
    expect(within(active).getByText(/no se vuelve a cobrar\. Pierde el plan en el acto/)).toBeInTheDocument();
    expect(within(active).getByText(/87\.000,00 ARS por período/)).toBeInTheDocument();
    await userEvent.click(within(active).getByRole("button", { name: "Cancelar", hidden: true }));
  });

  it("does not talk about charges when canceling a subscription that was never paid", async () => {
    const incomplete = { ...file().subscription!, status: "INCOMPLETE" as const };
    renderAt(`/usuarios/${USER_ID}`, ["OWNER"], handlerWith({ subscription: incomplete }));
    await userEvent.click(await screen.findByRole("button", { name: "Cancelar suscripción" }));
    const dialog = dialogOf("Cancelar suscripción");
    expect(within(dialog).getByText(/Todavía no se cobró nada/)).toBeInTheDocument();
    expect(within(dialog).queryByText(/no se vuelve a cobrar/)).toBeNull();
    expect(within(dialog).queryByText(/por período/)).toBeNull();
  });

  it("shows the last day of the period instead of its exclusive end", async () => {
    renderAt(`/usuarios/${USER_ID}`, ["FINANCE"], handlerWith({}));
    for (const title of ["Plan", "Uso"]) {
      const section = (await screen.findByRole("heading", { name: title })).closest("section") as HTMLElement;
      const period = within(section).getByText("Período").parentElement as HTMLElement;
      expect(period).toHaveTextContent("16 oct 2026 al 14 nov 2026");
    }
  });

  it("shows no next charge for a subscription that is not charging", async () => {
    const paused = { ...file().subscription!, status: "PAUSED" as const, providerNextPaymentAt: "2026-11-15T03:00:00Z" };
    renderAt(`/usuarios/${USER_ID}`, ["FINANCE"], handlerWith({ subscription: paused }));
    const summary = await screen.findByLabelText("Resumen");
    const next = within(summary).getByText("Próximo cobro").parentElement as HTMLElement;
    expect(within(next).getByText("—")).toBeInTheDocument();
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
    expect(screen.queryAllByRole("button").filter((button) => button.closest(".section"))).toEqual([]);
  });

  it("says when the user does not exist", async () => {
    renderAt(`/usuarios/${USER_ID}`, ["OWNER"], () => json(404, { error: "Not found", message: "User not found" }));
    expect(await screen.findByText("No encontramos este usuario")).toBeInTheDocument();
  });

  it("treats an id that is not a UUID as not found without asking core", async () => {
    const calls = renderAt("/usuarios/abc", ["OWNER"], () => json(400, { error: "Bad request", message: "Invalid value for parameter 'userId'" }));
    expect(await screen.findByText("No encontramos este usuario")).toBeInTheDocument();
    expect(calls).toEqual([]);
  });
});

describe("the end of a Demo extension", () => {
  it("is the last second of the chosen day in Buenos Aires, which core still accepts on day 365", () => {
    expect(endOfDay("2030-02-01")).toBe("2030-02-02T02:59:59.000Z");
    expect(Date.parse(endOfDay(addDays(today(), 365)))).toBeLessThan(Date.parse(`${addDays(today(), 366)}T00:00:00-03:00`));
  });
});
