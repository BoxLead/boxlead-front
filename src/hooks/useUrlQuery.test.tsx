import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useSearchParams } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useUrlQuery } from "./useUrlQuery";

function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useUrlQuery(searchParams, setSearchParams);
  return (
    <>
      <input aria-label="Buscar" value={query} onChange={(event) => setQuery(event.target.value)} />
      <p data-testid="url">{searchParams.toString()}</p>
    </>
  );
}

describe("useUrlQuery", () => {
  afterEach(() => vi.useRealTimers());

  it("starts from the URL and writes the trimmed query back after a pause", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(
      <MemoryRouter initialEntries={["/app/leads?status=NEW&q=ana"]}>
        <Search />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText("Buscar")).toHaveValue("ana");
    await userEvent.clear(screen.getByLabelText("Buscar"));
    await userEvent.type(screen.getByLabelText("Buscar"), " martín ");
    expect(screen.getByTestId("url")).toHaveTextContent("status=NEW&q=ana");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(screen.getByTestId("url")).toHaveTextContent("status=NEW&q=mart%C3%ADn");
    await userEvent.clear(screen.getByLabelText("Buscar"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(screen.getByTestId("url")).toHaveTextContent(/^status=NEW$/);
  });
});
