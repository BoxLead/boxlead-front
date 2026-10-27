import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { json, mockFetch, type Reply } from "../../test/fetch";
import { dateRange, enumOf, filterProblem, type FilterRules } from "./filterRules";
import { DateFilter, FilterBar, SearchFilter, SelectFilter } from "./Filters";
import { ListView } from "./ListView";
import { useListQuery } from "./useListQuery";

type Row = { id: string; email: string };

const KEYS = ["status", "query", "userId", "from", "to"] as const;
const STATUS_OPTIONS = [{ value: "APPROVED", label: "Aprobado" }];
const RULES: FilterRules = {
  status: enumOf(STATUS_OPTIONS),
  query: { kind: "query" },
  userId: { kind: "uuid", what: "de usuario" },
  ...dateRange("from", "to"),
};

function Location() {
  const location = useLocation();
  return <p data-testid="location">{location.search}</p>;
}

function Payments() {
  const { params, query } = useListQuery<Row>("/admin/payments", KEYS, RULES);
  return (
    <ListView
      caption="Pagos"
      query={query}
      columns={[{ key: "email", header: "Email", cell: (row) => row.email }]}
      rowKey={(row) => row.id}
      filtered={params.active}
      onClearFilters={params.clear}
      onPageChange={params.setPage}
      emptyTitle="Todavía no hay pagos"
      filters={
        <FilterBar active={params.active} onClear={params.clear}>
          <SelectFilter
            label="Estado"
            value={params.value("status")}
            options={STATUS_OPTIONS}
            onChange={(value) => params.setFilter("status", value)}
          />
          <SearchFilter label="Buscar" value={params.value("query")} onSubmit={(value) => params.setFilter("query", value)} />
          <DateFilter label="Desde" value={params.value("from")} onChange={(value) => params.setFilter("from", value)} />
        </FilterBar>
      }
    />
  );
}

function renderList(path: string, handler: (url: URL) => Reply) {
  const calls = mockFetch((_method, url) => handler(url));
  render(
    <MemoryRouter initialEntries={[path]}>
      <Payments />
      <Location />
    </MemoryRouter>,
  );
  return calls;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ListView", () => {
  it("shows the loading state and then the empty state", async () => {
    renderList("/pagos", () => json(200, { items: [], page: 0, size: 50, totalItems: 0 }));
    expect(screen.getByRole("status")).toHaveTextContent("Cargando…");
    expect(await screen.findByText("Todavía no hay pagos")).toBeInTheDocument();
  });

  it("shows the error and loads again on retry", async () => {
    let fail = true;
    renderList("/pagos", () => {
      if (fail) {
        fail = false;
        return json(500, { error: "Internal", message: "boom" });
      }
      return json(200, { items: [{ id: "p1", email: "ana@example.com" }], page: 0, size: 50, totalItems: 1 });
    });
    expect(await screen.findByText("No pudimos cargar la lista")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByRole("cell", { name: "ana@example.com" })).toBeInTheDocument();
    expect(screen.getByText("1 a 1 de 1")).toBeInTheDocument();
  });

  it("keeps filters and page in the URL, counting pages from one, and sends them to the API", async () => {
    const calls = renderList("/pagos?page=2", (url) =>
      json(200, {
        items: [{ id: `p${url.searchParams.get("page") ?? 0}`, email: "ana@example.com" }],
        page: Number(url.searchParams.get("page") ?? 0),
        size: 1,
        totalItems: 3,
      }),
    );
    expect(await screen.findByText("2 a 2 de 3")).toBeInTheDocument();
    expect(calls[0].url.search).toBe("?page=1");
    await userEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(await screen.findByText("3 a 3 de 3")).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("?page=3");
    expect(calls.at(-1)?.url.search).toBe("?page=2");
    expect(screen.getByRole("button", { name: "Siguiente" })).toBeDisabled();
    await userEvent.selectOptions(screen.getByLabelText("Estado"), "APPROVED");
    expect(screen.getByTestId("location")).toHaveTextContent("?status=APPROVED");
    expect(await screen.findByText("1 a 1 de 3")).toBeInTheDocument();
    expect(calls.at(-1)?.url.search).toBe("?status=APPROVED");
    await userEvent.click(screen.getByRole("button", { name: "Limpiar" }));
    expect(screen.getByTestId("location")).toBeEmptyDOMElement();
  });

  it("says when nothing matches the filters", async () => {
    renderList("/pagos?status=APPROVED", () => json(200, { items: [], page: 0, size: 50, totalItems: 0 }));
    expect(await screen.findByText("Nada coincide con estos filtros")).toBeInTheDocument();
  });

  it("shows an error with a way to clear the filters without asking the API again", async () => {
    renderList("/pagos?status=APPROVED", () => json(400, { error: "Bad request", message: "bad" }));
    expect(await screen.findByText("No pudimos cargar la lista")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));
    expect(screen.getByTestId("location")).toBeEmptyDOMElement();
  });

  it.each([
    ["/pagos?status=FOO", "Uno de los filtros tiene un valor que no es una opción. Limpialos y elegí de nuevo."],
    ["/pagos?query=a", "La búsqueda necesita entre 2 y 200 caracteres."],
    [`/pagos?query=${"a".repeat(201)}`, "La búsqueda necesita entre 2 y 200 caracteres."],
    ["/pagos?userId=abc", "El id de usuario no tiene el formato correcto."],
    ["/pagos?from=ayer", "Una de las fechas no tiene el formato correcto."],
    ["/pagos?from=2026-10-27&to=2026-10-26", "La fecha de inicio tiene que ser anterior a la de fin."],
  ])("refuses to ask with the filters of %s and lets them be cleared", async (path, message) => {
    const calls = renderList(path, () => json(200, { items: [], page: 0, size: 50, totalItems: 0 }));
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.getByText("Revisá los filtros")).toBeInTheDocument();
    expect(calls).toHaveLength(0);
    await userEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));
    expect(screen.getByTestId("location")).toBeEmptyDOMElement();
    expect(await screen.findByText("Todavía no hay pagos")).toBeInTheDocument();
  });

  it("accepts valid filters", () => {
    const values = { status: ["APPROVED"], query: ["ana"], userId: ["0c000000-0000-4000-8000-000000000001"], from: ["2026-10-01"], to: ["2026-10-27"] };
    expect(filterProblem(RULES, (key) => values[key as keyof typeof values] ?? [])).toBeNull();
  });

  it("offers the first page when the page asked for is beyond the list", async () => {
    renderList("/pagos?page=9", (url) =>
      url.searchParams.get("page") === "8"
        ? json(200, { items: [], page: 8, size: 50, totalItems: 3 })
        : json(200, { items: [{ id: "p1", email: "ana@example.com" }], page: 0, size: 50, totalItems: 3 }),
    );
    expect(await screen.findByText("Esta página está vacía")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Ir a la primera página" }));
    expect(screen.getByTestId("location")).toBeEmptyDOMElement();
    expect(await screen.findByRole("cell", { name: "ana@example.com" })).toBeInTheDocument();
  });
});
