import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../../App";
import type { AdminMe, AdminRole } from "../../api/types";
import { SessionProvider } from "../../session/SessionProvider";
import { json, mockFetch, type Reply } from "../../test/fetch";
import { canHold, canRelease, canReverse, downloadPayout, isReleasable, releasedBy } from "./api";
import type { Commission, Payout, ResellerDetail } from "./types";

const LATER = new Date(Date.now() + 30 * 60_000).toISOString();
const PAST = new Date(Date.now() - 86_400_000).toISOString();
const FUTURE = new Date(Date.now() + 86_400_000).toISOString();
const REASON = "Revisado con el equipo comercial";

function me(roles: AdminRole[]): AdminMe {
  return {
    userId: "u1",
    email: "equipo@boxlead.app",
    roles,
    factorConfirmed: true,
    enrollmentOpenUntil: null,
    factorLockedUntil: null,
    adminSessionExpiresAt: LATER,
  };
}

function commission(overrides: Partial<Commission>): Commission {
  return {
    id: "c1",
    resellerId: "r1",
    customerUserId: "11111111-0000-4000-8000-000000000001",
    paymentId: "p1",
    kind: "ACCRUAL",
    reversesEntryId: null,
    cycleNumber: 1,
    amount: { amountMinor: 1_000_000, currency: "ARS" },
    status: "ACCRUED",
    releaseAt: PAST,
    payoutId: null,
    createdAt: PAST,
    ...overrides,
  };
}

const PAYOUT: Payout = {
  id: "p-1",
  resellerId: "r1",
  periodEnd: "2026-10-31",
  total: { amountMinor: 1_500_000, currency: "ARS" },
  status: "DRAFT",
  paidAt: null,
  transferReference: null,
  createdAt: PAST,
};

function renderAdmin(path: string, roles: AdminRole[], api: (method: string, url: URL, body: unknown) => Reply) {
  const calls = mockFetch((method, url, body) => {
    if (url.pathname === "/auth/me") return json(200, { userId: "u1", email: "equipo@boxlead.app", name: "Equipo" });
    if (url.pathname === "/admin/me") return json(200, me(roles));
    return api(method, url, body);
  });
  render(
    <MemoryRouter initialEntries={[path]}>
      <SessionProvider>
        <App />
      </SessionProvider>
    </MemoryRouter>,
  );
  return calls;
}

function page<T>(items: T[]) {
  return json(200, { items, page: 0, size: 100, totalItems: items.length });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("commission rules", () => {
  it("only approves accrued rows past their release and holds what is not in a payout", () => {
    expect(isReleasable(commission({}))).toBe(true);
    expect(isReleasable(commission({ releaseAt: FUTURE }))).toBe(false);
    expect(isReleasable(commission({ status: "HELD" }))).toBe(false);
    expect(canHold(commission({ status: "APPROVED" }))).toBe(true);
    expect(canHold(commission({ status: "APPROVED", payoutId: "p" }))).toBe(false);
    expect(canRelease(commission({ status: "HELD" }))).toBe(true);
    expect(canReverse(commission({ kind: "REVERSAL" }))).toBe(false);
    expect(canReverse(commission({ status: "REVERSED" }))).toBe(false);
  });

  it("counts a release until the end of the period day in Buenos Aires", () => {
    expect(releasedBy(commission({ releaseAt: "2026-11-01T02:59:00Z" }), "2026-10-31")).toBe(true);
    expect(releasedBy(commission({ releaseAt: "2026-11-01T03:00:00Z" }), "2026-10-31")).toBe(false);
  });
});

describe("payout export", () => {
  it("downloads the CSV with the reason through a blob that is let go right away", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout"] });
    const calls = mockFetch(() => ({ status: 200, body: "a,b" }));
    const create = vi.fn(() => "blob:local/1");
    const revoke = vi.fn();
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    await downloadPayout(PAYOUT, REASON);

    expect(calls[0].url.pathname).toBe("/admin/payouts/p-1/export");
    expect(calls[0].url.searchParams.get("reason")).toBe(REASON);
    expect(calls[0].init.credentials).toBe("include");
    expect(calls[0].init.headers).toMatchObject({ "X-Requested-With": "boxlead-web" });
    expect(click).toHaveBeenCalledTimes(1);
    const link = click.mock.contexts[0] as HTMLAnchorElement;
    expect(link.download).toBe("liquidacion-2026-10-31-p-1.csv");
    expect(document.querySelector("a[download]")).toBeNull();
    vi.runAllTimers();
    expect(revoke).toHaveBeenCalledWith("blob:local/1");
    vi.useRealTimers();
    Reflect.deleteProperty(URL, "createObjectURL");
    Reflect.deleteProperty(URL, "revokeObjectURL");
  });
});

describe("commissions screen", () => {
  it("approves the chosen releasable rows with their ids and the reason", async () => {
    const rows = [
      commission({ id: "c1" }),
      commission({ id: "c2", amount: { amountMinor: 500_000, currency: "ARS" } }),
      commission({ id: "c3", releaseAt: FUTURE }),
    ];
    let approved: unknown = null;
    renderAdmin("/comisiones", ["FINANCE"], (method, url, body) => {
      if (url.pathname === "/admin/resellers") return page([]);
      if (url.pathname === "/admin/commissions") return page(rows);
      if (method === "POST" && url.pathname === "/admin/commissions/approve") {
        approved = body;
        return json(200, []);
      }
      return json(404, { error: "Not found", message: "Not found" });
    });
    expect(await screen.findAllByRole("checkbox", {}, { timeout: 5000 })).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Nuevo revendedor" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Elegir las liberables" }));
    await userEvent.click(screen.getByRole("button", { name: "Aprobar elegidas" }));
    const dialog = screen.getByText("Aprobar comisiones").closest("dialog");
    if (!dialog) throw new Error("The approval dialog did not open");
    expect(within(dialog).getByText(/15\.000,00/)).toBeInTheDocument();
    await userEvent.type(within(dialog).getByLabelText("Motivo"), REASON);
    await userEvent.click(within(dialog).getByRole("button", { name: "Aprobar 2 comisiones", hidden: true }));
    expect(approved).toEqual({ ids: ["c1", "c2"], reason: REASON });
  }, 20_000);
});

describe("reseller detail", () => {
  it("shows what only finance sees as missing for support and hides owner actions", async () => {
    const detail: ResellerDetail = {
      reseller: {
        id: "r1",
        userId: "u9",
        displayName: "Agencia Norte",
        status: "ACTIVE",
        rateBps: 5000,
        maxPaidCycles: 6,
        createdAt: PAST,
        codes: [{ id: "k1", resellerId: "r1", code: "7KQ2M9XTRB", status: "ACTIVE", disabledAt: null, createdAt: PAST }],
      },
      customersCount: 0,
      clicks: [],
      billing: null,
      commissionTotals: null,
    };
    renderAdmin("/revendedores/r1", ["SUPPORT"], (_method, url) => {
      if (url.pathname === "/admin/resellers/r1") return json(200, detail);
      if (url.pathname === "/admin/resellers/r1/customers") return page([]);
      if (url.pathname === "/admin/resellers") return page([]);
      return json(404, { error: "Not found", message: "Not found" });
    });
    expect(await screen.findByRole("heading", { level: 1, name: "Agencia Norte" }, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByText("Los datos fiscales y de cobro los ve solo Finanzas.")).toBeInTheDocument();
    expect(screen.getByText("Los totales de comisión los ve solo Finanzas.")).toBeInTheDocument();
    expect(screen.getByText("No hubo clics en este período.")).toBeInTheDocument();
    expect(await screen.findByText("Todavía no tiene clientes")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Desactivar" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Nuevo código" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Armar liquidación" })).toBeNull();
  }, 20_000);
});
