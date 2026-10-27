import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { json, mockFetch, type Reply } from "../../test/fetch";
import { FilterBar, SelectFilter } from "./Filters";
import { ListView } from "./ListView";
import { useListQuery } from "./useListQuery";

type Row = { id: string; email: string };

const KEYS = ["status"] as const;

function Location() {
  const location = useLocation();
  return <p data-testid="location">{location.search}</p>;
}

function Payments() {
  const { params, query } = useListQuery<Row>("/admin/payments", KEYS);
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
            options={[{ value: "APPROVED", label: "Aprobado" }]}
            onChange={(value) => params.setFilter("status", value)}
          />
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

  it("keeps filters and page in the URL and sends them to the API", async () => {
    const calls = renderList("/pagos?page=1", (url) =>
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
});
