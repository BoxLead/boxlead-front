import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../../../../src/components/ui/ToastProvider";
import type { AdminMe, AdminRole } from "../../api/types";
import { SessionContext, type SessionValue } from "../../session/session";
import { json, mockFetch, type Reply } from "../../test/fetch";
import { AuditScreen } from "./AuditScreen";
import { ConsumerRequestsScreen } from "./ConsumerRequestsScreen";
import { TeamScreen } from "./TeamScreen";
import type { AuditEvent, ConsumerRequest, TeamMember, UsageDay, UsageSummary } from "./types";
import { UsageScreen } from "./UsageScreen";
import { formatCost, rangeProblem } from "./usage";

const SELF = "0b0e0000-0000-4000-8000-0000000000a1";
const LUCIA = "0b0e0000-0000-4000-8001-000000000001";

const retry = vi.fn(() => Promise.resolve());

function session(roles: AdminRole[]): SessionValue {
  const me: AdminMe = {
    userId: SELF,
    email: "equipo@boxlead.app",
    roles,
    factorConfirmed: true,
    enrollmentOpenUntil: null,
    factorLockedUntil: null,
    adminSessionExpiresAt: new Date(Date.now() + 600_000).toISOString(),
  };
  const noop = () => Promise.resolve();
  return {
    stage: { kind: "ready", me },
    connectionLost: false,
    reauthenticating: false,
    retry,
    signIn: noop,
    confirmEnrollment: noop,
    openSession: noop,
    reauthenticate: noop,
    cancelReauthentication: () => undefined,
    signOut: noop,
  };
}

function renderScreen(element: ReactNode, roles: AdminRole[], path: string, handler: (method: string, url: URL, body: unknown) => Reply) {
  const calls = mockFetch(handler);
  render(
    <MemoryRouter initialEntries={[path]}>
      <SessionContext.Provider value={session(roles)}>
        <ToastProvider>{element}</ToastProvider>
      </SessionContext.Provider>
    </MemoryRouter>,
  );
  return calls;
}

function pageOf<T>(items: T[]) {
  return { items, page: 0, size: 50, totalItems: items.length };
}

function request(fields: Partial<ConsumerRequest> & Pick<ConsumerRequest, "id" | "kind">): ConsumerRequest {
  return {
    code: `BX-${fields.id.toUpperCase()}`,
    email: `${fields.id}@example.com`,
    userId: null,
    subscriptionId: null,
    details: null,
    status: "RECEIVED",
    resolution: null,
    resolvedBy: null,
    resolvedAt: null,
    receiptSentAt: null,
    createdAt: "2026-10-20T12:00:00Z",
    refundable: null,
    ...fields,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("usage helpers", () => {
  it("formats micros in the currency of core and checks the range", () => {
    expect(formatCost(1_284_500, "USD")).toMatch(/1,2845/);
    expect(formatCost(0, null)).toBe("0,00");
    expect(rangeProblem("2026-10-01", "2026-10-26")).toBeNull();
    expect(rangeProblem("2026-10-27", "2026-10-26")).toBe("La fecha de inicio tiene que ser anterior a la de fin.");
    expect(rangeProblem("2025-01-01", "2026-10-26")).toBe("El período puede tener hasta 366 días.");
  });
});

describe("UsageScreen", () => {
  const summary: UsageSummary = {
    items: [
      { key: LUCIA, email: "lucia@example.com", runs: 3, inputTokens: 1200, outputTokens: 300, cacheReadTokens: 10, cacheWriteTokens: 5, estimatedCostMicros: 2_500_000, costCurrency: "USD", rowsWithoutCost: 0 },
      { key: LUCIA, email: "lucia@example.com", runs: 1, inputTokens: 100, outputTokens: 20, cacheReadTokens: 0, cacheWriteTokens: 0, estimatedCostMicros: 0, costCurrency: null, rowsWithoutCost: 2 },
    ],
    page: 0,
    size: 100,
    totalItems: 2,
    totals: [
      { runs: 3, inputTokens: 1200, outputTokens: 300, cacheReadTokens: 10, cacheWriteTokens: 5, estimatedCostMicros: 2_500_000, costCurrency: "USD", rowsWithoutCost: 0 },
      { runs: 1, inputTokens: 100, outputTokens: 20, cacheReadTokens: 0, cacheWriteTokens: 0, estimatedCostMicros: 0, costCurrency: null, rowsWithoutCost: 2 },
    ],
  };

  it("asks the summary for the range and shows totals per currency and rows without cost", async () => {
    const calls = renderScreen(<UsageScreen />, ["SUPPORT"], "/uso?from=2026-10-01&to=2026-10-26&groupBy=DAY", () => json(200, { ...summary, items: summary.items.map((row) => ({ ...row, key: "2026-10-20", email: null })) }));
    expect(await screen.findByText("Costo estimado en USD")).toBeInTheDocument();
    expect(calls[0].url.pathname).toBe("/admin/usage/summary");
    expect(calls[0].url.search).toBe("?from=2026-10-01&to=2026-10-26&groupBy=DAY");
    expect(screen.getByText("Sin moneda de costo")).toBeInTheDocument();
    expect(screen.getByText(/2 filas no tienen costo calculado/)).toBeInTheDocument();
    expect(screen.getByText("2 filas sin costo")).toBeInTheDocument();
  });

  it("opens the detail of a user from the summary", async () => {
    const calls = renderScreen(<UsageScreen />, ["SUPPORT"], "/uso?from=2026-10-01&to=2026-10-26", (_method, url) =>
      url.pathname === "/admin/usage" ? json(200, { items: [], page: 0, size: 100, totalItems: 0 }) : json(200, summary),
    );
    await userEvent.click((await screen.findAllByRole("link", { name: "Ver detalle" }))[0]);
    expect(await screen.findByText("Nada coincide con estos filtros")).toBeInTheDocument();
    expect(calls.at(-1)?.url.pathname).toBe("/admin/usage");
    expect(calls.at(-1)?.url.searchParams.get("userId")).toBe(LUCIA);
  });

  it("links the user of each detail row and says when the cost was computed", async () => {
    const day: UsageDay = {
      userId: LUCIA,
      day: "2026-10-20",
      agentId: "0b0e0000-0000-4000-8002-000000000001",
      model: "claude-sonnet-4-5",
      runs: 4,
      inputTokens: 1000,
      outputTokens: 200,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      estimatedCostMicros: 1_500_000,
      costCurrency: "USD",
      priceVersion: 2,
      computedAt: "2026-10-21T03:00:00Z",
    };
    renderScreen(<UsageScreen />, ["SUPPORT"], "/uso?view=detalle&from=2026-10-01&to=2026-10-26", () => json(200, { items: [day], page: 0, size: 100, totalItems: 1 }));
    expect(await screen.findByRole("link", { name: LUCIA.slice(0, 8) })).toHaveAttribute("href", `/usuarios/${LUCIA}`);
    expect(screen.getByText("Calculado el 21 oct 2026, 00:00")).toBeInTheDocument();
    expect(screen.getByText("Precios versión 2")).toBeInTheDocument();
    expect(screen.getByText(/El costo lo estima el agente con su tabla de precios y core solo lo guarda/)).toBeInTheDocument();
  });

  it("does not ask core with a range it would reject", async () => {
    const calls = renderScreen(<UsageScreen />, ["SUPPORT"], "/uso?from=2026-10-27&to=2026-10-26", () => json(200, summary));
    expect(await screen.findByText("La fecha de inicio tiene que ser anterior a la de fin.")).toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });
});

describe("ConsumerRequestsScreen", { timeout: 20_000 }, () => {
  const pending = [
    request({ id: "w1", kind: "WITHDRAWAL", userId: LUCIA, details: "Contraté ayer y me arrepentí.\nNo lo voy a usar.", refundable: { amountMinor: 1_890_000, currency: "ARS" } }),
    request({ id: "c1", kind: "CANCELLATION" }),
  ];

  it("lets support close a cancellation but leaves a withdrawal to finance", async () => {
    renderScreen(<ConsumerRequestsScreen />, ["SUPPORT"], "/pedidos", () => json(200, pageOf(pending)));
    expect(await screen.findByText("Lo cierra Finanzas")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Cerrar pedido" })).toHaveLength(1);
  });

  it("explains the refund with its amount and the full details and sends status, resolution and reason", async () => {
    const calls = renderScreen(<ConsumerRequestsScreen />, ["FINANCE"], "/pedidos", (method) =>
      method === "POST" ? json(200, { ...pending[0], status: "RESOLVED", refundable: null }) : json(200, pageOf(pending)),
    );
    await userEvent.click((await screen.findAllByRole("button", { name: "Cerrar pedido" }))[0]);
    const dialog = screen.getByRole("dialog", { hidden: true });
    expect(within(dialog).getByText(/Reembolsa el último pago aprobado y cancela la suscripción en el acto/)).toBeInTheDocument();
    expect(within(dialog).getByText("ARS")).toBeInTheDocument();
    expect(within(dialog).getByText(/18\.900/)).toBeInTheDocument();
    expect(within(dialog).queryByText("No hay pago para reembolsar.")).toBeNull();
    expect(within(dialog).getByText((_, node) => node?.tagName === "BLOCKQUOTE" && node.textContent === "Contraté ayer y me arrepentí.\nNo lo voy a usar.")).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Rechazar", hidden: true }));
    expect(within(dialog).queryByText("ARS")).toBeNull();
    await userEvent.click(within(dialog).getByRole("button", { name: "Resolver", hidden: true }));
    await userEvent.type(screen.getByLabelText("Motivo"), "Pedido dentro de los diez días");
    await userEvent.click(screen.getByRole("button", { name: "Resolver arrepentimiento", hidden: true }));
    expect(await screen.findByText("Escribí la respuesta para el cliente.", { selector: ".banner-text" })).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Respuesta para el cliente"), "Te devolvemos el pago completo.");
    await userEvent.click(screen.getByRole("button", { name: "Resolver arrepentimiento", hidden: true }));
    await vi.waitFor(() => expect(calls.some((call) => call.method === "POST")).toBe(true));
    const post = calls.find((call) => call.method === "POST");
    expect(post?.url.pathname).toBe("/admin/consumer-requests/w1/resolve");
    expect(JSON.parse(String(post?.init.body))).toEqual({
      status: "RESOLVED",
      resolution: "Te devolvemos el pago completo.",
      reason: "Pedido dentro de los diez días",
    });
  });

  it("says when there is no payment to refund", async () => {
    renderScreen(<ConsumerRequestsScreen />, ["FINANCE"], "/pedidos", () => json(200, pageOf([{ ...pending[0], refundable: null }])));
    await userEvent.click(await screen.findByRole("button", { name: "Cerrar pedido" }));
    expect(screen.getByText("No hay pago para reembolsar.")).toBeInTheDocument();
    expect(screen.queryByText("Monto")).toBeNull();
  });

  it("loads the list again after closing a request", async () => {
    const calls = renderScreen(<ConsumerRequestsScreen />, ["SUPPORT"], "/pedidos", (method) =>
      method === "POST" ? json(200, { ...pending[1], status: "RESOLVED" }) : json(200, pageOf(pending)),
    );
    await userEvent.click(await screen.findByRole("button", { name: "Cerrar pedido" }));
    await userEvent.type(screen.getByLabelText("Respuesta para el cliente"), "Cancelamos tu suscripción.");
    await userEvent.type(screen.getByLabelText("Motivo"), "Baja pedida desde la web");
    await userEvent.click(screen.getByRole("button", { name: "Resolver baja", hidden: true }));
    await vi.waitFor(() => expect(calls.filter((call) => call.method === "GET")).toHaveLength(2));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("says inside the dialog that the request was already closed and loads the list again on close", async () => {
    const calls = renderScreen(<ConsumerRequestsScreen />, ["SUPPORT"], "/pedidos", (method) =>
      method === "POST" ? json(409, { error: "Conflict", message: "The consumer request is already closed" }) : json(200, pageOf(pending)),
    );
    await userEvent.click(await screen.findByRole("button", { name: "Cerrar pedido" }));
    await userEvent.type(screen.getByLabelText("Respuesta para el cliente"), "Cancelamos tu suscripción.");
    await userEvent.type(screen.getByLabelText("Motivo"), "Baja pedida desde la web");
    await userEvent.click(screen.getByRole("button", { name: "Resolver baja", hidden: true }));
    const dialog = screen.getByRole("dialog", { hidden: true });
    expect(await within(dialog).findByText("Ese pedido ya fue cerrado. Cerrá este diálogo para ver la lista al día.")).toBeInTheDocument();
    expect(calls.filter((call) => call.method === "GET")).toHaveLength(1);
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancelar", hidden: true }));
    await vi.waitFor(() => expect(calls.filter((call) => call.method === "GET")).toHaveLength(2));
  });

  it("does not offer to close a request of the own account unless owner", async () => {
    renderScreen(<ConsumerRequestsScreen />, ["SUPPORT"], "/pedidos", () => json(200, pageOf([request({ id: "c2", kind: "CANCELLATION", userId: SELF })])));
    expect(await screen.findByText("Es tu cuenta")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cerrar pedido" })).toBeNull();
  });

  it("links who closed a request", async () => {
    renderScreen(<ConsumerRequestsScreen />, ["SUPPORT"], "/pedidos?status=RESOLVED", () =>
      json(200, pageOf([request({ id: "c3", kind: "CANCELLATION", status: "RESOLVED", resolution: "Listo.", resolvedBy: SELF, resolvedAt: "2026-10-21T12:00:00Z" })])),
    );
    const link = await screen.findByRole("link", { name: SELF.slice(0, 8) });
    expect(link).toHaveAttribute("href", `/usuarios/${SELF}`);
    expect(screen.getByText("Sin enviar")).toBeInTheDocument();
  });

  it("says a rejection does not cancel or refund", async () => {
    renderScreen(<ConsumerRequestsScreen />, ["SUPPORT"], "/pedidos", () => json(200, pageOf(pending)));
    await userEvent.click(await screen.findByRole("button", { name: "Cerrar pedido" }));
    expect(screen.getByText(/cancela la suscripción vigente al final del período pago/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Rechazar", hidden: true }));
    expect(screen.getByText("Rechazar solo cierra el pedido. No cancela la suscripción ni reembolsa nada.")).toBeInTheDocument();
  });

  it("asks for the closed ones by status", async () => {
    const calls = renderScreen(<ConsumerRequestsScreen />, ["SUPPORT"], "/pedidos?status=REJECTED", () => json(200, pageOf([])));
    expect(await screen.findByText("Todavía no hay pedidos rechazados")).toBeInTheDocument();
    expect(calls[0].url.search).toBe("?status=REJECTED");
  });
});

describe("TeamScreen", { timeout: 20_000 }, () => {
  const members: TeamMember[] = [
    { userId: SELF, email: "equipo@boxlead.app", name: "Equipo", hasPassword: true, roles: [{ grantId: "g1", role: "OWNER", grantedAt: "2026-06-01T12:00:00Z", grantedBy: null }], factorConfirmed: true, enrollmentOpenUntil: null, lastAdminSessionAt: null },
    { userId: LUCIA, email: "carla@example.com", name: "Carla", hasPassword: true, roles: [{ grantId: "g2", role: "SUPPORT", grantedAt: "2026-10-25T12:00:00Z", grantedBy: SELF }], factorConfirmed: false, enrollmentOpenUntil: null, lastAdminSessionAt: null },
  ];

  it("keeps the only owner and explains that the last role deletes the factor", async () => {
    const calls = renderScreen(<TeamScreen />, ["OWNER"], "/equipo", (method) => (method === "DELETE" ? json(204) : json(200, pageOf(members))));
    expect(await screen.findByText("Único Dueño")).toBeInTheDocument();
    expect(screen.getByText("Ventana vencida")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Quitar Soporte a carla@example.com" }));
    expect(screen.getByText(/Se borra su factor TOTP y se cierran sus sesiones de administración/)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Motivo"), "Dejó el equipo de soporte");
    await userEvent.click(screen.getByRole("button", { name: "Quitar rol", hidden: true }));
    await vi.waitFor(() => expect(calls.some((call) => call.method === "DELETE")).toBe(true));
    const removal = calls.find((call) => call.method === "DELETE");
    expect(removal?.url.pathname).toBe("/admin/grants/g2");
    expect(JSON.parse(String(removal?.init.body))).toEqual({ reason: "Dejó el equipo de soporte" });
  });

  it("says when the role was already removed and loads the team again on close", async () => {
    const calls = renderScreen(<TeamScreen />, ["OWNER"], "/equipo", (method) =>
      method === "DELETE" ? json(404, { error: "Not found", message: "Grant not found" }) : json(200, pageOf(members)),
    );
    await userEvent.click(await screen.findByRole("button", { name: "Quitar Soporte a carla@example.com" }));
    const listed = calls.filter((call) => call.url.pathname === "/admin/grants").length;
    await userEvent.type(screen.getByLabelText("Motivo"), "Dejó el equipo de soporte");
    await userEvent.click(screen.getByRole("button", { name: "Quitar rol", hidden: true }));
    expect(await screen.findByText("Ese rol ya fue quitado.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Cancelar", hidden: true }));
    await vi.waitFor(() => expect(calls.filter((call) => call.url.pathname === "/admin/grants").length).toBe(listed + 1));
  });

  it("says inside the dialog that the last owner can not be removed and loads the team again on close", async () => {
    const second: TeamMember = { ...members[1], roles: [{ grantId: "g4", role: "OWNER", grantedAt: "2026-10-25T12:00:00Z", grantedBy: SELF }], factorConfirmed: true };
    const calls = renderScreen(<TeamScreen />, ["OWNER"], "/equipo", (method) =>
      method === "DELETE" ? json(409, { error: "Conflict", message: "The last owner cannot be revoked" }) : json(200, pageOf([members[0], second])),
    );
    await userEvent.click(await screen.findByRole("button", { name: "Quitar Dueño a carla@example.com" }));
    expect(screen.queryByText(/Ningún otro Dueño configuró su factor/)).toBeNull();
    await userEvent.type(screen.getByLabelText("Motivo"), "Deja de ser Dueña");
    await userEvent.click(screen.getByRole("button", { name: "Quitar rol", hidden: true }));
    const dialog = screen.getByRole("dialog", { hidden: true });
    expect(await within(dialog).findByText("Es el último Dueño y no se puede quitar. Otorgá Dueño a otra persona primero.")).toBeInTheDocument();
    const listed = calls.filter((call) => call.url.pathname === "/admin/grants" && call.method === "GET").length;
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancelar", hidden: true }));
    await vi.waitFor(() => expect(calls.filter((call) => call.url.pathname === "/admin/grants" && call.method === "GET").length).toBe(listed + 1));
  });

  it("warns when no other owner has a confirmed factor", async () => {
    const pending: TeamMember = { ...members[1], roles: [{ grantId: "g4", role: "OWNER", grantedAt: "2026-10-25T12:00:00Z", grantedBy: SELF }], factorConfirmed: false };
    renderScreen(<TeamScreen />, ["OWNER"], "/equipo", () => json(200, pageOf([members[0], pending])));
    await userEvent.click(await screen.findByRole("button", { name: "Quitar Dueño a equipo@boxlead.app" }));
    expect(screen.getByText(/Ningún otro Dueño configuró su factor/)).toBeInTheDocument();
  });

  it("links the audit of each person", async () => {
    renderScreen(<TeamScreen />, ["OWNER"], "/equipo", () => json(200, pageOf(members)));
    expect(await screen.findByRole("link", { name: "Ver auditoría de carla@example.com" })).toHaveAttribute("href", `/auditoria?actorUserId=${LUCIA}`);
  });

  it("warns without blocking when the account has no password and keeps an owner from taking the other roles", async () => {
    renderScreen(<TeamScreen />, ["OWNER"], "/equipo", (_method, url) =>
      url.pathname === "/admin/customers"
        ? json(200, {
            ...pageOf([
              { id: SELF, email: "equipo@boxlead.app", name: "Equipo", legalName: null, createdAt: "2026-06-01T00:00:00Z", hasPassword: true },
              { id: LUCIA, email: "carla@example.com", name: "Carla", legalName: null, createdAt: "2026-07-01T00:00:00Z", hasPassword: false },
            ]),
            size: 20,
          })
        : json(200, pageOf(members)),
    );
    await userEvent.click(await screen.findByRole("button", { name: "Otorgar rol" }));
    await userEvent.type(screen.getByLabelText("Buscar usuario"), "equipo{Enter}");
    const results = await screen.findByRole("list", { name: "Resultados" });
    await userEvent.click(within(results).getByRole("button", { name: /equipo@boxlead\.app/ }));
    const roles = screen.getByRole("group", { name: "Rol" });
    for (const name of ["Soporte", "Finanzas", "Dueño"]) expect(within(roles).getByRole("button", { name })).toBeDisabled();
    expect(screen.getByText("Ya es Dueño, que incluye todos los permisos.")).toBeInTheDocument();
    expect(screen.queryByText(/no tiene contraseña/)).toBeNull();

    await userEvent.click(within(results).getByRole("button", { name: /carla@example\.com/ }));
    expect(screen.getByText("Esta cuenta no tiene contraseña. Puede entrar si antes abre sesión en boxlead.app con Google.")).toBeInTheDocument();
    await userEvent.click(within(screen.getByRole("group", { name: "Rol" })).getByRole("button", { name: "Finanzas" }));
    const open = screen.getByRole("button", { name: "Otorgar Finanzas" });
    expect(open).toBeEnabled();
    await userEvent.click(open);
    expect(screen.getAllByText(/Esta cuenta no tiene contraseña/)).toHaveLength(2);
  });

  it("rebuilds the session when the role was taken away in the middle of an action", async () => {
    retry.mockClear();
    renderScreen(<TeamScreen />, ["OWNER"], "/equipo", (method) =>
      method === "DELETE" ? json(403, { error: "Forbidden", message: "Role required", code: "ROLE_REQUIRED" }) : json(200, pageOf(members)),
    );
    await userEvent.click(await screen.findByRole("button", { name: "Quitar Soporte a carla@example.com" }));
    await userEvent.type(screen.getByLabelText("Motivo"), "Dejó el equipo de soporte");
    await userEvent.click(screen.getByRole("button", { name: "Quitar rol", hidden: true }));
    await vi.waitFor(() => expect(retry).toHaveBeenCalledTimes(1));
  });

  it("finds an existing user and grants a role with the reason", async () => {
    const calls = renderScreen(<TeamScreen />, ["OWNER"], "/equipo", (method, url) => {
      if (method === "POST") return json(201, { id: "g3", userId: LUCIA, role: "FINANCE", grantedAt: "2026-10-26T12:00:00Z", enrollmentOpenUntil: null });
      if (url.pathname === "/admin/customers") {
        return json(200, { ...pageOf([{ id: LUCIA, email: "carla@example.com", name: "Carla", legalName: null, createdAt: "2026-07-01T00:00:00Z", hasPassword: true }]), size: 20 });
      }
      return json(200, pageOf(members));
    });
    await userEvent.click(await screen.findByRole("button", { name: "Otorgar rol" }));
    await userEvent.type(screen.getByLabelText("Buscar usuario"), "carla{Enter}");
    await userEvent.click(await within(await screen.findByRole("list", { name: "Resultados" })).findByRole("button", { name: /carla@example\.com/ }));
    expect(calls.find((call) => call.url.pathname === "/admin/customers")?.url.search).toBe("?query=carla");
    const roles = screen.getByRole("group", { name: "Rol" });
    expect(within(roles).getByRole("button", { name: "Soporte" })).toBeDisabled();
    await userEvent.click(within(roles).getByRole("button", { name: "Finanzas" }));
    await userEvent.click(screen.getByRole("button", { name: "Otorgar Finanzas" }));
    expect(screen.getByText(/tiene 24 horas para hacerlo/)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Motivo"), "Se suma a cobranzas");
    const confirm = screen.getAllByRole("button", { name: "Otorgar Finanzas", hidden: true }).at(-1);
    if (!confirm) throw new Error("missing confirm");
    await userEvent.click(confirm);
    await vi.waitFor(() => expect(calls.some((call) => call.method === "POST")).toBe(true));
    expect(JSON.parse(String(calls.find((call) => call.method === "POST")?.init.body))).toEqual({ userId: LUCIA, role: "FINANCE", reason: "Se suma a cobranzas" });
  });
});

describe("AuditScreen", () => {
  const event: AuditEvent = {
    id: "e1",
    occurredAt: "2026-10-25T12:00:00Z",
    actorType: "ADMIN",
    actorUserId: SELF,
    action: "ADMIN_GRANTED",
    targetType: "ADMIN_GRANT",
    targetId: "g3",
    before: null,
    after: { userId: LUCIA, role: "FINANCE", note: "<img src=x onerror=alert(1)>" },
    reason: "Se suma a cobranzas",
    ip: "203.0.113.10",
    requestId: "req-1",
  };

  it("sends the filters and shows before and after as text", async () => {
    const calls = renderScreen(<AuditScreen />, ["OWNER"], "/auditoria?action=ADMIN_GRANTED&from=2026-10-01", () => json(200, pageOf([event])));
    await userEvent.click(await screen.findByRole("button", { name: "Ver antes y después" }));
    expect(calls[0].url.search).toBe("?action=ADMIN_GRANTED&from=2026-10-01");
    expect(screen.getByText("Sin datos")).toBeInTheDocument();
    expect(screen.getByText(/"note": "<img src=x onerror=alert\(1\)>"/)).toBeInTheDocument();
    expect(document.querySelector("img[src=x]")).toBeNull();
  });

  it("links the actor, a user target and the user of a role and names the request id", async () => {
    const touched: AuditEvent = { ...event, id: "e2", action: "USER_UPDATED", targetType: "USER", targetId: LUCIA, after: null };
    renderScreen(<AuditScreen />, ["OWNER"], "/auditoria", () => json(200, pageOf([event, touched])));
    const [granted, updated] = (await screen.findAllByRole("row")).slice(1);
    const hrefs = (row: HTMLElement) => within(row).getAllByRole("link").map((link) => link.getAttribute("href"));
    expect(hrefs(granted)).toEqual([`/usuarios/${SELF}`, `/usuarios/${LUCIA}`]);
    expect(within(granted).getByText("g3")).toBeInTheDocument();
    expect(hrefs(updated)).toEqual([`/usuarios/${SELF}`, `/usuarios/${LUCIA}`]);
    expect(updated.textContent).not.toContain("De 0b0e");
    await userEvent.click(within(granted).getByRole("button", { name: "Ver antes y después" }));
    expect(screen.getByText("Id de la solicitud")).toBeInTheDocument();
    expect(screen.queryByText("Pedido")).toBeNull();
  });

  it("checks the actor id before asking core", async () => {
    const calls = renderScreen(<AuditScreen />, ["OWNER"], "/auditoria?actorUserId=nope", () => json(200, pageOf([])));
    expect(await screen.findByText("El id del actor no tiene el formato correcto.")).toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });

  it("asks for the target type before searching by target id", async () => {
    const calls = renderScreen(<AuditScreen />, ["OWNER"], "/auditoria?targetId=abc", () => json(200, pageOf([])));
    expect(await screen.findByText("Elegí el tipo de objetivo para buscar por id.")).toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });
});
