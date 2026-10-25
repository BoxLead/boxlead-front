import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "../api/client";
import type { AuthUser } from "../api/types";
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
