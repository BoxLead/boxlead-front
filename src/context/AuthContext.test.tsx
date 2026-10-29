import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "../api/client";
import type { AuthUser } from "../api/types";
import { clearQueryCache } from "../data/queryCache";
import { requestSessionRefresh } from "../data/session";
import { useApiQuery } from "../hooks/useApiQuery";
import { useAuth } from "./auth";
import { AuthProvider } from "./AuthContext";

function user(access: AuthUser["access"]): AuthUser {
  return {
    userId: "u1",
    email: "ana@negocio.com",
    name: null,
    features: { billing: true, referrals: false, legal: false },
    access,
    isReseller: false,
    pendingLegal: [],
  };
}

function Actions() {
  const { register, socialLogin, login } = useAuth();
  return (
    <>
      <button onClick={() => void register({ email: "ana@negocio.com", password: "clave-segura" }, "/app/inbox")}>
        registrar
      </button>
      <button onClick={() => void socialLogin("id-token", "/app/inbox")}>social</button>
      <button onClick={() => void login({ email: "ana@negocio.com", password: "clave-segura" }, "/app/inbox")}>
        entrar
      </button>
    </>
  );
}

function Inbox() {
  const { access } = useAuth();
  return <p>acceso {access}</p>;
}

function renderProvider() {
  render(
    <MemoryRouter initialEntries={["/register"]}>
      <AuthProvider>
        <Routes>
          <Route path="/register" element={<Actions />} />
          <Route path="/app/inbox" element={<Inbox />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("AuthProvider", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function sessionAfterInvitation() {
    return vi
      .spyOn(api, "me")
      .mockRejectedValueOnce(new ApiError("Unauthorized", 401))
      .mockResolvedValue(user("FULL"));
  }

  it("asks for the session again after a sign up so an accepted invitation counts", async () => {
    const me = sessionAfterInvitation();
    vi.spyOn(api, "register").mockResolvedValue(user("RESTRICTED"));
    renderProvider();
    await userEvent.click(await screen.findByRole("button", { name: "registrar" }));
    expect(await screen.findByText("acceso FULL")).toBeInTheDocument();
    expect(me).toHaveBeenCalledTimes(2);
  });

  it("does the same after a social login", async () => {
    sessionAfterInvitation();
    vi.spyOn(api, "socialLogin").mockResolvedValue(user("RESTRICTED"));
    renderProvider();
    await userEvent.click(await screen.findByRole("button", { name: "social" }));
    expect(await screen.findByText("acceso FULL")).toBeInTheDocument();
  });

  it("keeps the sign up answer when the session cannot be read again", async () => {
    vi.spyOn(api, "me").mockRejectedValue(new ApiError("Unavailable", 503));
    vi.spyOn(api, "register").mockResolvedValue(user("RESTRICTED"));
    renderProvider();
    await userEvent.click(await screen.findByRole("button", { name: "registrar" }));
    expect(await screen.findByText("acceso RESTRICTED")).toBeInTheDocument();
  });

  it("trusts the login answer as before", async () => {
    const me = sessionAfterInvitation();
    vi.spyOn(api, "login").mockResolvedValue(user("RESTRICTED"));
    renderProvider();
    await userEvent.click(await screen.findByRole("button", { name: "entrar" }));
    await waitFor(() => expect(screen.getByText("acceso RESTRICTED")).toBeInTheDocument());
    expect(me).toHaveBeenCalledTimes(1);
  });
});

function Session() {
  const { features, access } = useAuth();
  return <p>{`facturación ${features.billing ? "sí" : "no"}, acceso ${access}`}</p>;
}

function renderApp() {
  render(
    <MemoryRouter initialEntries={["/app/inbox"]}>
      <AuthProvider>
        <Routes>
          <Route path="/app/inbox" element={<Session />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("AuthProvider keeps the session fresh", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reads the session again when the window gets the focus back", async () => {
    const me = vi
      .spyOn(api, "me")
      .mockResolvedValueOnce(user("RESTRICTED"))
      .mockResolvedValueOnce({ ...user("FULL"), features: { billing: false, referrals: false, legal: false } });
    renderApp();
    expect(await screen.findByText("facturación sí, acceso RESTRICTED")).toBeInTheDocument();
    act(() => {
      window.dispatchEvent(new Event("focus"));
    });
    expect(await screen.findByText("facturación no, acceso FULL")).toBeInTheDocument();
    expect(me).toHaveBeenCalledTimes(2);
  });

  it("reads it again on request and only once at a time", async () => {
    let answer: (value: AuthUser) => void = () => undefined;
    const me = vi
      .spyOn(api, "me")
      .mockResolvedValueOnce(user("FULL"))
      .mockImplementationOnce(() => new Promise<AuthUser>((resolve) => (answer = resolve)));
    renderApp();
    expect(await screen.findByText("facturación sí, acceso FULL")).toBeInTheDocument();
    act(() => {
      requestSessionRefresh();
      window.dispatchEvent(new Event("focus"));
      requestSessionRefresh();
    });
    expect(me).toHaveBeenCalledTimes(2);
    await act(async () => answer(user("RESTRICTED")));
    expect(await screen.findByText("facturación sí, acceso RESTRICTED")).toBeInTheDocument();
  });

  it("keeps the session when it cannot be read again and asks nothing without one", async () => {
    const me = vi.spyOn(api, "me").mockResolvedValueOnce(user("FULL")).mockRejectedValueOnce(new ApiError("Down", 503));
    renderApp();
    expect(await screen.findByText("facturación sí, acceso FULL")).toBeInTheDocument();
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });
    expect(screen.getByText("facturación sí, acceso FULL")).toBeInTheDocument();
    expect(me).toHaveBeenCalledTimes(2);
  });

  it("does not ask without a session", async () => {
    const me = vi.spyOn(api, "me").mockRejectedValue(new ApiError("Unauthorized", 401));
    renderApp();
    expect(await screen.findByText("facturación no, acceso FULL")).toBeInTheDocument();
    act(() => {
      window.dispatchEvent(new Event("focus"));
      requestSessionRefresh();
    });
    expect(me).toHaveBeenCalledTimes(1);
  });
});

function Leads() {
  const { user } = useAuth();
  const leads = useApiQuery<{ owner: string }>("/leads");
  return <p>{`${user?.email ?? "nadie"} ve los leads de ${leads.data?.owner ?? "nadie"}`}</p>;
}

function renderLeads() {
  render(
    <MemoryRouter initialEntries={["/app/leads"]}>
      <AuthProvider>
        <Routes>
          <Route path="/app/leads" element={<Leads />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("AuthProvider when another tab changes the session", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    clearQueryCache();
  });

  const other: AuthUser = { ...user("FULL"), userId: "u2", email: "beto@otro.com" };

  it("drops the cached data of the previous user and loads it again", async () => {
    vi.spyOn(api, "me").mockResolvedValueOnce(user("FULL")).mockResolvedValueOnce(other);
    const get = vi
      .spyOn(api, "get")
      .mockResolvedValueOnce({ owner: "ana" })
      .mockResolvedValueOnce({ owner: "beto" });
    renderLeads();
    expect(await screen.findByText("ana@negocio.com ve los leads de ana")).toBeInTheDocument();
    act(() => {
      window.dispatchEvent(new Event("focus"));
    });
    expect(await screen.findByText("beto@otro.com ve los leads de beto")).toBeInTheDocument();
    expect(screen.queryByText(/de ana/)).toBeNull();
    expect(get).toHaveBeenCalledTimes(2);
  });

  it("keeps the cache when the same user comes back with other flags", async () => {
    vi.spyOn(api, "me").mockResolvedValueOnce(user("FULL")).mockResolvedValueOnce(user("RESTRICTED"));
    const get = vi.spyOn(api, "get").mockResolvedValue({ owner: "ana" });
    renderLeads();
    expect(await screen.findByText("ana@negocio.com ve los leads de ana")).toBeInTheDocument();
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });
    expect(screen.getByText("ana@negocio.com ve los leads de ana")).toBeInTheDocument();
    expect(get).toHaveBeenCalledTimes(1);
  });
});
