import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../../App";
import type { AdminMe, AdminRole } from "../../api/types";
import { SessionProvider } from "../../session/SessionProvider";
import { json, mockFetch, type Reply } from "../../test/fetch";
import { canHold, canRelease, canReverse, clickRangeProblem, downloadPayout, isReleasable, releasedBy, todayInBuenosAires } from "./api";
import type { Commission, Payout, Reseller, ResellerDetail } from "./types";

const LATER = new Date(Date.now() + 30 * 60_000).toISOString();
const PAST = new Date(Date.now() - 86_400_000).toISOString();
const FUTURE = new Date(Date.now() + 86_400_000).toISOString();
const REASON = "Revisado con el equipo comercial";
const NORTH = "00000101-0b0e-4000-8000-000000000001";

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
    expect(calls[0].method).toBe("POST");
    expect(calls[0].url.search).toBe("");
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ reason: REASON });
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
        id: NORTH,
        userId: "u9",
        displayName: "Agencia Norte",
        status: "ACTIVE",
        rateBps: 5000,
        maxPaidCycles: 6,
        createdAt: PAST,
        codes: [{ id: "k1", resellerId: NORTH, code: "7KQ2M9XTRB", status: "ACTIVE", disabledAt: null, createdAt: PAST }],
      },
      customersCount: 0,
      clicks: [],
      billing: null,
      commissionTotals: null,
    };
    const calls = renderAdmin(`/revendedores/${NORTH}`, ["SUPPORT"], (_method, url) => {
      if (url.pathname === `/admin/resellers/${NORTH}`) return json(200, detail);
      if (url.pathname === `/admin/resellers/${NORTH}/customers`) return page([]);
      if (url.pathname === "/admin/resellers") return page([]);
      return json(404, { error: "Not found", message: "Not found" });
    });
    expect(await screen.findByRole("heading", { level: 1, name: "Agencia Norte" }, { timeout: 5000 })).toBeInTheDocument();
    const order = calls.map((call) => call.url.pathname);
    expect(order.indexOf(`/admin/resellers/${NORTH}/customers`)).toBe(order.indexOf(`/admin/resellers/${NORTH}`) + 1);
    expect(screen.getByText("Los datos fiscales y de cobro los ve solo Finanzas.")).toBeInTheDocument();
    expect(screen.getByText("Los totales de comisión los ve solo Finanzas.")).toBeInTheDocument();
    expect(screen.getByText("No hubo clics en este período.")).toBeInTheDocument();
    expect(await screen.findByText("Todavía no tiene clientes")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Desactivar" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Nuevo código" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Armar liquidación" })).toBeNull();
  }, 20_000);

  it("keeps the screen and warns in the clicks section when the range ends before it starts", async () => {
    const detail: ResellerDetail = {
      reseller: {
        id: NORTH,
        userId: "u9",
        displayName: "Agencia Norte",
        status: "ACTIVE",
        rateBps: 5000,
        maxPaidCycles: 6,
        createdAt: PAST,
        codes: [{ id: "k1", resellerId: NORTH, code: "7KQ2M9XTRB", status: "ACTIVE", disabledAt: null, createdAt: PAST }],
      },
      customersCount: 0,
      clicks: [{ day: "2026-10-12", referralCodeId: "k1", clicks: 4 }],
      billing: null,
      commissionTotals: null,
    };
    const calls = renderAdmin(`/revendedores/${NORTH}?from=2026-10-20&to=2026-10-10`, ["OWNER"], (_method, url) => {
      if (url.pathname === `/admin/resellers/${NORTH}`) {
        if (url.search) return json(400, { error: "bad range", message: "bad range" });
        return json(200, detail);
      }
      if (url.pathname === `/admin/resellers/${NORTH}/customers`) return page([]);
      if (url.pathname === "/admin/resellers") return page([]);
      return json(404, { error: "Not found", message: "Not found" });
    });
    expect(await screen.findByRole("heading", { level: 1, name: "Agencia Norte" }, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByText("Revisá el período")).toBeInTheDocument();
    expect(screen.getByText("La fecha de inicio tiene que ser anterior a la de fin.")).toBeInTheDocument();
    expect(screen.getByLabelText("Desde")).toHaveValue("2026-10-20");
    expect(screen.getByLabelText("Hasta")).toHaveValue("2026-10-10");
    expect(screen.queryByText(/hubo/)).toBeNull();
    expect(screen.queryByText("No pudimos cargar esta pantalla")).toBeNull();
    const detailCalls = calls.filter((call) => call.url.pathname === `/admin/resellers/${NORTH}`);
    expect(detailCalls.map((call) => call.url.search)).toEqual([""]);
  }, 20_000);

  it("checks the clicks range against today when it has no end", () => {
    expect(clickRangeProblem("", "", "2026-10-27")).toBeNull();
    expect(clickRangeProblem("2026-10-01", "2026-10-01", "2026-10-27")).toBeNull();
    expect(clickRangeProblem("2026-10-02", "2026-10-01", "2026-10-27")).toBe("La fecha de inicio tiene que ser anterior a la de fin.");
    expect(clickRangeProblem("2026-10-28", "", "2026-10-27")).toMatch(/termina hoy/);
    expect(clickRangeProblem("", "2026-10-28", "2026-10-27")).toBeNull();
    expect(clickRangeProblem("ayer", "", "2026-10-27")).toBe("Una de las fechas no tiene el formato correcto.");
  });

  it("treats an id that is not a UUID as not found without asking core", async () => {
    const calls = renderAdmin("/revendedores/abc", ["OWNER"], () => json(500, { error: "boom", message: "boom" }));
    expect(await screen.findByText("No encontramos este revendedor")).toBeInTheDocument();
    expect(calls.filter((call) => call.url.pathname.startsWith("/admin/resellers"))).toEqual([]);
  });
});

describe("new reseller", () => {
  it("searches the user, shows who was picked and sends its id", async () => {
    const searches: string[] = [];
    let created: unknown = null;
    renderAdmin("/revendedores", ["OWNER"], (method, url, body) => {
      if (url.pathname === "/admin/customers") {
        searches.push(url.searchParams.get("query") ?? "");
        return page([
          {
            id: "u-west",
            email: "oeste@example.com",
            name: "Martín Oeste",
            legalName: "Agencia Oeste SRL",
            createdAt: PAST,
            planCode: "STARTER",
            subscriptionStatus: "ACTIVE",
          },
        ]);
      }
      if (method === "POST" && url.pathname === "/admin/resellers") {
        created = body;
        return json(400, { error: "x", message: "x" });
      }
      if (url.pathname === "/admin/resellers") return page([]);
      return json(404, { error: "Not found", message: "Not found" });
    });
    await userEvent.click(await screen.findByRole("button", { name: "Nuevo revendedor" }, { timeout: 5000 }));
    const dialog = screen.getByText("Nuevo revendedor", { selector: "h2" }).closest("dialog");
    if (!dialog) throw new Error("The reseller dialog did not open");
    const box = within(dialog);
    await userEvent.type(box.getByLabelText("Buscar usuario"), "oeste{Enter}");
    await userEvent.click(await box.findByRole("radio", { name: /oeste@example\.com/, hidden: true }));
    expect(box.getByText("Usuario elegido")).toBeInTheDocument();
    expect(box.getByLabelText("Razón social")).toHaveValue("Agencia Oeste SRL");
    expect(box.getByLabelText("Nombre visible")).toHaveValue("Martín Oeste");
    await userEvent.type(box.getByLabelText("CUIT"), "30-44444444-1");
    await userEvent.selectOptions(box.getByLabelText("Condición frente al IVA"), "EXENTO");
    await userEvent.type(box.getByLabelText("Motivo"), REASON);
    await userEvent.click(box.getByRole("button", { name: "Crear revendedor", hidden: true }));
    expect(searches).toEqual(["oeste"]);
    expect(created).toMatchObject({ userId: "u-west", displayName: "Martín Oeste", legalName: "Agencia Oeste SRL", vatCondition: "EXENTO", reason: REASON });
  }, 20_000);
});

const NORTH_RESELLER: Reseller = {
  id: NORTH,
  userId: "u9",
  displayName: "Agencia Norte",
  status: "ACTIVE",
  rateBps: 5000,
  maxPaidCycles: 6,
  createdAt: PAST,
  codes: [],
};

function dialogTitled(title: string): HTMLElement {
  const dialog = screen.getByText(title, { selector: "h2" }).closest("dialog");
  if (!dialog) throw new Error(`The dialog ${title} did not open`);
  return dialog;
}

function buildPayout(approved: Commission[], answer: () => Reply = () => json(201, { ...PAYOUT, resellerId: NORTH })) {
  const posted: unknown[] = [];
  const asked: URLSearchParams[] = [];
  const calls = renderAdmin("/liquidaciones", ["FINANCE"], (method, url, body) => {
    if (url.pathname === "/admin/resellers") return page([NORTH_RESELLER]);
    if (method === "POST" && url.pathname === "/admin/payouts") {
      posted.push(body);
      return answer();
    }
    if (url.pathname === "/admin/payouts") return page([]);
    if (url.pathname === "/admin/commissions") {
      asked.push(url.searchParams);
      return page(approved);
    }
    return json(404, { error: "Not found", message: "Not found" });
  });
  return { calls, posted, asked };
}

async function openBuildDialog() {
  await userEvent.click(await screen.findByRole("button", { name: "Armar liquidación" }, { timeout: 5000 }));
  const box = within(dialogTitled("Armar liquidación"));
  await userEvent.selectOptions(box.getByLabelText("Revendedor"), NORTH);
  return box;
}

async function confirmBuild(box: ReturnType<typeof within>) {
  await userEvent.type(box.getByLabelText("Motivo"), REASON);
  await userEvent.click(box.getByRole("button", { name: "Armar liquidación", hidden: true }));
}

describe("build a payout", () => {
  it("previews only the approved rows released by the period end and sends the reseller, the day and the reason", async () => {
    const { posted, asked } = buildPayout([
      commission({ id: "c1", resellerId: NORTH, status: "APPROVED" }),
      commission({ id: "c2", resellerId: NORTH, status: "APPROVED", amount: { amountMinor: 250_000, currency: "ARS" } }),
      commission({ id: "c3", resellerId: NORTH, status: "APPROVED", payoutId: "p-old" }),
      commission({ id: "c4", resellerId: NORTH, status: "APPROVED", releaseAt: new Date(Date.now() + 3 * 86_400_000).toISOString() }),
    ]);
    const box = await openBuildDialog();
    expect(await box.findByText("2 movimientos. El monto final lo calcula BoxLead al armarla.")).toBeInTheDocument();
    expect(box.getByText(/12\.500,00/)).toBeInTheDocument();
    expect(asked[0].getAll("status")).toEqual(["APPROVED"]);
    expect(asked[0].get("resellerId")).toBe(NORTH);
    await confirmBuild(box);
    expect(posted).toEqual([{ resellerId: NORTH, periodEnd: todayInBuenosAires(), reason: REASON }]);
  }, 20_000);

  it("does not accept a period end after today in Buenos Aires", async () => {
    const { posted, asked } = buildPayout([commission({ resellerId: NORTH, status: "APPROVED" })]);
    const box = await openBuildDialog();
    await box.findByText(/1 movimiento\./);
    const field = box.getByLabelText("Cierre del período");
    expect(field).toHaveAttribute("max", todayInBuenosAires());
    const before = asked.length;
    fireEvent.change(field, { target: { value: "2999-01-01" } });
    expect(box.getAllByText("El cierre del período no puede ser posterior a hoy.").length).toBeGreaterThan(0);
    await confirmBuild(box);
    expect(posted).toEqual([]);
    expect(asked).toHaveLength(before);
  }, 20_000);

  it("refuses mixed currencies before asking core", async () => {
    const { posted } = buildPayout([
      commission({ id: "c1", resellerId: NORTH, status: "APPROVED" }),
      commission({ id: "c2", resellerId: NORTH, status: "APPROVED", amount: { amountMinor: 5_000, currency: "USD" } }),
    ]);
    const box = await openBuildDialog();
    expect(await box.findByText(/ARS$/)).toBeInTheDocument();
    expect(box.getByText(/USD$/)).toBeInTheDocument();
    expect(box.queryByText("Monto")).toBeNull();
    await confirmBuild(box);
    expect(await box.findByText("Las comisiones aprobadas mezclan monedas y no entran en una sola liquidación.")).toBeInTheDocument();
    expect(posted).toEqual([]);
  }, 20_000);

  it("refuses a balance that is not positive before asking core", async () => {
    const { posted } = buildPayout([
      commission({ id: "c1", resellerId: NORTH, status: "APPROVED", amount: { amountMinor: 100_000, currency: "ARS" } }),
      commission({ id: "c2", resellerId: NORTH, status: "APPROVED", kind: "REVERSAL", reversesEntryId: "c0", amount: { amountMinor: -300_000, currency: "ARS" } }),
    ]);
    const box = await openBuildDialog();
    await box.findByText(/2 movimientos\./);
    await confirmBuild(box);
    expect(await box.findByText("El saldo aprobado no es positivo. Queda para la próxima liquidación.")).toBeInTheDocument();
    expect(posted).toEqual([]);
  }, 20_000);

  it.each([
    ["PAYOUT_NOTHING_TO_PAY", "Ese revendedor no tiene comisiones aprobadas para liquidar en ese período."],
    ["PAYOUT_MIXED_CURRENCIES", "Las comisiones aprobadas están en más de una moneda y una liquidación lleva una sola. Armá una por moneda."],
    ["PAYOUT_NOT_POSITIVE", "El total de la liquidación no es positivo. Revisá las reversas antes de armarla."],
  ])("explains %s when core refuses after the preview", async (code, message) => {
    const { posted } = buildPayout([commission({ resellerId: NORTH, status: "APPROVED" })], () => json(409, { error: "x", message: "x", code }));
    const box = await openBuildDialog();
    await box.findByText(/1 movimiento\./);
    await confirmBuild(box);
    expect(await box.findByText(message)).toBeInTheDocument();
    expect(posted).toHaveLength(1);
    expect(box.getByRole("button", { name: "Armar liquidación", hidden: true })).toBeEnabled();
  }, 20_000);
});

describe("mark a payout paid", () => {
  const EXPORTED: Payout = { ...PAYOUT, resellerId: NORTH, status: "EXPORTED" };

  function renderPayout(answer: (body: unknown) => Reply) {
    const posted: unknown[] = [];
    let current: Payout = EXPORTED;
    renderAdmin(`/liquidaciones/${PAYOUT.id}`, ["FINANCE"], (method, url, body) => {
      if (url.pathname === "/admin/resellers") return page([NORTH_RESELLER]);
      if (method === "POST" && url.pathname === `/admin/payouts/${PAYOUT.id}/paid`) {
        posted.push(body);
        const reply = answer(body);
        if (!(reply instanceof Error) && reply.status === 200) current = reply.body as Payout;
        return reply;
      }
      if (url.pathname === `/admin/payouts/${PAYOUT.id}`) return json(200, { payout: current, entries: [] });
      return json(404, { error: "Not found", message: "Not found" });
    });
    return posted;
  }

  it("sends the trimmed transfer reference and shows the payout paid", async () => {
    const posted = renderPayout((body) => {
      const reference = (body as { transferReference: string | null }).transferReference;
      return json(200, { ...EXPORTED, status: "PAID", paidAt: PAST, transferReference: reference });
    });
    await userEvent.click(await screen.findByRole("button", { name: "Marcar pagada" }, { timeout: 5000 }));
    const box = within(dialogTitled("Marcar pagada"));
    expect(box.getByText(/15\.000,00/)).toBeInTheDocument();
    await userEvent.type(box.getByLabelText(/Referencia de la transferencia/), "  OP-778899  ");
    await userEvent.type(box.getByLabelText("Motivo"), REASON);
    await userEvent.click(box.getByRole("button", { name: "Marcar pagada", hidden: true }));
    expect(posted).toEqual([{ transferReference: "OP-778899", reason: REASON }]);
    expect(await screen.findByText("La liquidación quedó pagada.")).toBeInTheDocument();
    expect(await screen.findByText("OP-778899")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Marcar pagada" })).toBeNull();
  }, 20_000);

  it("sends no reference when it is blank and keeps the dialog with the error when core refuses", async () => {
    const posted = renderPayout(() => json(409, { error: "Only an exported payout can be marked paid", message: "x" }));
    await userEvent.click(await screen.findByRole("button", { name: "Marcar pagada" }, { timeout: 5000 }));
    const box = within(dialogTitled("Marcar pagada"));
    await userEvent.type(box.getByLabelText("Motivo"), REASON);
    await userEvent.click(box.getByRole("button", { name: "Marcar pagada", hidden: true }));
    expect(posted).toEqual([{ transferReference: null, reason: REASON }]);
    expect(await box.findByText("El estado cambió y esta acción ya no aplica. Recargá para ver lo último.")).toBeInTheDocument();
    expect(screen.queryByText("La liquidación quedó pagada.")).toBeNull();
  }, 20_000);
});
