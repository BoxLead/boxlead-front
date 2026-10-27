import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ResellerDirectoryNotice } from "../components/ResellerDirectoryNotice";
import { json, mockFetch } from "../test/fetch";
import { ResellerDirectoryProvider } from "./ResellerDirectoryProvider";
import { useResellerDirectory } from "./resellerDirectory";

const NORTH = "00000101-0b0e-4000-8000-000000000001";
const DELTA = "00000101-0b0e-4000-8000-000000000002";

function reseller(id: string, displayName: string) {
  return { id, userId: id, displayName, status: "ACTIVE", rateBps: 2000, maxPaidCycles: 6, createdAt: "2026-01-01T00:00:00Z", codes: [] };
}

function Names() {
  const directory = useResellerDirectory();
  return (
    <>
      <p>{directory.status}</p>
      <p>{directory.nameOf(NORTH)}</p>
      <p>{directory.nameOf(DELTA)}</p>
      <ResellerDirectoryNotice directory={directory} />
      <button type="button" onClick={directory.invalidate}>
        Invalidar
      </button>
    </>
  );
}

function Screens() {
  const [shown, setShown] = useState<"a" | "b" | null>("a");
  return (
    <ResellerDirectoryProvider>
      <button type="button" onClick={() => setShown("b")}>
        Otra pantalla
      </button>
      <button type="button" onClick={() => setShown(null)}>
        Ninguna
      </button>
      {shown === "a" ? <Names key="a" /> : null}
      {shown === "b" ? <Names key="b" /> : null}
    </ResellerDirectoryProvider>
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ResellerDirectoryProvider", () => {
  it("loads every page once and shares the names between screens", async () => {
    const calls = mockFetch((_method, url) => {
      const page = Number(url.searchParams.get("page"));
      return json(200, { items: [reseller(page === 0 ? NORTH : DELTA, page === 0 ? "Agencia Norte" : "Estudio Delta")], page, size: 1, totalItems: 2 });
    });
    render(<Screens />);
    expect(await screen.findByText("Agencia Norte")).toBeInTheDocument();
    expect(screen.getByText("Estudio Delta")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Otra pantalla" }));
    expect(screen.getByText("Agencia Norte")).toBeInTheDocument();
    expect(calls.map((call) => call.url.search)).toEqual(["?page=0", "?page=1"]);
  });

  it("shows the error with a retry instead of a silent short id, and loads again after invalidating", async () => {
    let fail = true;
    const calls = mockFetch(() => {
      if (fail) return json(500, { error: "Internal", message: "boom" });
      return json(200, { items: [reseller(NORTH, "Agencia Norte")], page: 0, size: 50, totalItems: 1 });
    });
    render(<Screens />);
    expect(await screen.findByText("No pudimos cargar los revendedores")).toBeInTheDocument();
    expect(screen.getAllByText(`Revendedor ${NORTH.slice(0, 8)}`)).toHaveLength(2);
    fail = false;
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("Agencia Norte")).toBeInTheDocument();
    expect(screen.queryByText("No pudimos cargar los revendedores")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Invalidar" }));
    expect(await screen.findByText("Agencia Norte")).toBeInTheDocument();
    expect(calls).toHaveLength(3);
  });

  it("asks nothing until a screen uses it", async () => {
    const calls = mockFetch(() => json(200, { items: [], page: 0, size: 50, totalItems: 0 }));
    render(<Screens />);
    await userEvent.click(screen.getByRole("button", { name: "Ninguna" }));
    expect(calls).toHaveLength(1);
  });
});
