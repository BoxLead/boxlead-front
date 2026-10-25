import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReferralsResponse } from "../../api/types";
import { ToastContext, type ToastInput } from "../../components/ui/toast";
import { REFERRALS_KEY } from "../../data/referrals";
import { Reseller } from "./Reseller";

type Query = {
  data: unknown;
  error: string | null;
  loading: boolean;
  reload: () => void;
};

const queries = new Map<string, Query>();

vi.mock("../../hooks/useApiQuery", () => ({
  useApiQuery: (key: string | null) =>
    queries.get(key ?? "") ?? { data: undefined, error: null, loading: true, reload: () => undefined },
}));

const LINK = "https://api.boxlead.app/r/7KX2M9QH4R";

const filled: ReferralsResponse = {
  codes: [
    { code: "7KX2M9QH4R", link: LINK, status: "ACTIVE" },
    { code: "0000000000", link: "https://api.boxlead.app/r/0000000000", status: "DISABLED" },
  ],
  stats: { clicksLast30Days: 1240, registrations: 6, activeCustomers: 3 },
  customers: [{ label: "Negocio SRL", cycle: 3, maxCycles: 6, subscriptionStatus: "PAST_DUE" }],
  totals: [
    { status: "PAID", amount: { amountMinor: 1000000, currency: "ARS" } },
    { status: "ACCRUED", amount: { amountMinor: 185175, currency: "ARS" } },
  ],
  entries: [
    {
      date: "2026-09-02T12:00:00Z",
      customerLabel: "Negocio SRL",
      cycle: 2,
      amount: { amountMinor: 1000000, currency: "ARS" },
      status: "PAID",
      releaseAt: null,
    },
    {
      date: "2026-10-02T12:00:00Z",
      customerLabel: "Negocio SRL",
      cycle: 3,
      amount: { amountMinor: 185175, currency: "ARS" },
      status: "ACCRUED",
      releaseAt: "2026-11-01T12:00:00Z",
    },
  ],
};

const empty: ReferralsResponse = {
  codes: [{ code: "7KX2M9QH4R", link: LINK, status: "ACTIVE" }],
  stats: { clicksLast30Days: 0, registrations: 0, activeCustomers: 0 },
  customers: [],
  totals: [],
  entries: [],
};

function respond(data: unknown, error: string | null = null, reload: () => void = () => undefined) {
  queries.set(REFERRALS_KEY, { data, error, loading: false, reload });
}

function renderPage(toast: (input: ToastInput) => void = () => undefined) {
  render(
    <MemoryRouter>
      <ToastContext.Provider value={toast}>
        <Reseller />
      </ToastContext.Provider>
    </MemoryRouter>,
  );
}

function plain(text: string | null): string {
  return (text ?? "").replace(/\s/g, " ");
}

afterEach(() => {
  queries.clear();
  vi.restoreAllMocks();
});

describe("Reseller", () => {
  it("shows a placeholder while loading", () => {
    renderPage();
    expect(screen.getByRole("status")).toHaveTextContent("Cargando…");
    expect(screen.queryByRole("button", { name: "Copiar link" })).not.toBeInTheDocument();
  });

  it("offers a retry when the data fails to load", async () => {
    const reload = vi.fn();
    respond(undefined, "Error del servidor", reload);
    renderPage();
    expect(screen.getByRole("alert")).toHaveTextContent("No pudimos cargar tus datos de revendedor");
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(reload).toHaveBeenCalledOnce();
  });

  it("shows the active link, the stats, the customers and the commissions", () => {
    respond(filled);
    renderPage();

    expect(screen.getByText(LINK)).toBeInTheDocument();
    expect(screen.queryByText("https://api.boxlead.app/r/0000000000")).not.toBeInTheDocument();

    const stats = screen.getByLabelText("Resumen");
    expect(within(stats).getAllByRole("definition").map((value) => value.textContent)).toEqual(["1.240", "6", "3"]);

    const customers = screen.getByRole("list", { name: "Clientes" });
    expect(within(customers).getByText("Negocio SRL")).toBeInTheDocument();
    expect(within(customers).getByText("Cobro 3 de 6")).toBeInTheDocument();
    expect(within(customers).getByText("Pago atrasado")).toBeInTheDocument();

    const totals = screen.getByLabelText("Totales por estado");
    expect(within(totals).getAllByRole("term").map((term) => term.textContent)).toEqual(["Pendiente", "Pagada"]);
    expect(within(totals).getAllByText(/\$/).map((node) => plain(node.textContent))).toEqual(["$ 1.851,75", "$ 10.000"]);

    const rows = within(screen.getByRole("table")).getAllByRole("row").slice(1);
    expect(rows.map((row) => within(row).getAllByRole("cell")[4].textContent)).toEqual(["Pendiente", "Pagada"]);
    expect(plain(within(rows[0]).getAllByRole("cell")[3].textContent)).toBe("$ 1.851,75");
    expect(within(rows[1]).getAllByRole("cell")[5]).toHaveTextContent("—");
  });

  it("shows empty states for a new reseller", () => {
    respond(empty);
    renderPage();
    expect(screen.getByText(LINK)).toBeInTheDocument();
    expect(screen.getByText("Todavía no tenés clientes")).toBeInTheDocument();
    expect(screen.getByText("Todavía no hay comisiones")).toBeInTheDocument();
    expect(screen.queryByLabelText("Totales por estado")).not.toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("explains when there is no active link", () => {
    respond({ ...empty, codes: [{ code: "7KX2M9QH4R", link: LINK, status: "DISABLED" }] });
    renderPage();
    expect(screen.getByText("No tenés un link activo")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Copiar link" })).not.toBeInTheDocument();
  });

  it("copies the link", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    const toast = vi.fn();
    respond(filled);
    renderPage(toast);
    await user.click(screen.getByRole("button", { name: "Copiar link" }));
    expect(writeText).toHaveBeenCalledWith(LINK);
    expect(toast).toHaveBeenCalledWith({ message: "Copiaste tu link." });
  });

  it("says so when the link cannot be copied", async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("denied"));
    const toast = vi.fn();
    respond(filled);
    renderPage(toast);
    await user.click(screen.getByRole("button", { name: "Copiar link" }));
    expect(toast).toHaveBeenCalledWith({ tone: "danger", message: "No pudimos copiar el link. Seleccionalo y copialo a mano." });
  });
});
