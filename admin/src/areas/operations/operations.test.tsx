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
import type { AuditEvent, ConsumerRequest, TeamMember, UsageSummary } from "./types";
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

  it("does not ask core with a range it would reject", async () => {
    const calls = renderScreen(<UsageScreen />, ["SUPPORT"], "/uso?from=2026-10-27&to=2026-10-26", () => json(200, summary));
    expect(await screen.findByText("La fecha de inicio tiene que ser anterior a la de fin.")).toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });
});

describe("ConsumerRequestsScreen", () => {
  const pending = [request({ id: "w1", kind: "WITHDRAWAL", userId: LUCIA }), request({ id: "c1", kind: "CANCELLATION" })];

  it("lets support close a cancellation but leaves a withdrawal to finance", async () => {
    renderScreen(<ConsumerRequestsScreen />, ["SUPPORT"], "/pedidos", () => json(200, pageOf(pending)));
    expect(await screen.findByText("Lo cierra Finanzas")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Cerrar pedido" })).toHaveLength(1);
  });

  it("explains the refund and sends status, resolution and reason", async () => {
    const calls = renderScreen(<ConsumerRequestsScreen />, ["FINANCE"], "/pedidos", (method) =>
      method === "POST" ? json(200, { ...pending[0], status: "RESOLVED" }) : json(200, pageOf(pending)),
    );
    await userEvent.click((await screen.findAllByRole("button", { name: "Cerrar pedido" }))[0]);
    expect(screen.getByText(/reembolsa completo el último pago aprobado/)).toBeInTheDocument();
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

describe("TeamScreen", () => {
  const members: TeamMember[] = [
    { userId: SELF, email: "equipo@boxlead.app", name: "Equipo", roles: [{ grantId: "g1", role: "OWNER", grantedAt: "2026-06-01T12:00:00Z", grantedBy: null }], factorConfirmed: true, enrollmentOpenUntil: null, lastAdminSessionAt: null },
    { userId: LUCIA, email: "carla@example.com", name: "Carla", roles: [{ grantId: "g2", role: "SUPPORT", grantedAt: "2026-10-25T12:00:00Z", grantedBy: SELF }], factorConfirmed: false, enrollmentOpenUntil: null, lastAdminSessionAt: null },
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
        return json(200, { ...pageOf([{ id: LUCIA, email: "carla@example.com", name: "Carla", legalName: null, createdAt: "2026-07-01T00:00:00Z" }]), size: 20 });
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
    after: { role: "FINANCE", note: "<img src=x onerror=alert(1)>" },
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
