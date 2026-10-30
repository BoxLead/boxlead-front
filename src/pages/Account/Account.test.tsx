import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ACCOUNT_FEATURES_OFF } from "../../api/client";
import type { AccountView, AuthUser } from "../../api/types";
import { ToastContext } from "../../components/ui/toast";
import { AuthContext, SESSION_FLAGS_OFF, type AuthContextValue } from "../../context/auth";
import { clearQueryCache } from "../../data/queryCache";
import { i18n } from "../../i18n";
import { Account } from "./Account";

const fetchMock = vi.fn<typeof fetch>();
const toast = vi.fn();

const PASSWORD_ACCOUNT: AccountView = {
  name: "Ana",
  email: "ana@negocio.com",
  pendingEmail: null,
  emailVerified: true,
  hasPassword: true,
  providers: [],
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function session(sessionRevocation = false, emailChange = true): AuthContextValue {
  const user: AuthUser = {
    ...SESSION_FLAGS_OFF,
    userId: "u-1",
    email: "ana@negocio.com",
    name: "Ana",
    account: { ...ACCOUNT_FEATURES_OFF, settings: true, sessionRevocation, emailChange },
  };
  return {
    ...SESSION_FLAGS_OFF,
    user,
    login: async () => undefined,
    register: async () => undefined,
    socialLogin: async () => undefined,
    logout: () => undefined,
    refreshUser: async () => undefined,
    isLoading: false,
    error: null,
    clearError: () => undefined,
  };
}

function renderAccount(sessionRevocation = false, emailChange = true) {
  render(
    <MemoryRouter>
      <AuthContext.Provider value={session(sessionRevocation, emailChange)}>
        <ToastContext.Provider value={toast}>
          <Account />
        </ToastContext.Provider>
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

function bodyOf(path: string): unknown {
  const call = fetchMock.mock.calls.find(([url, init]) => String(url).endsWith(path) && init?.body !== undefined);
  return JSON.parse(String(call?.[1]?.body));
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  clearQueryCache();
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
  toast.mockReset();
});

describe("account page", () => {
  it("shows the email state and the ways in", async () => {
    fetchMock.mockResolvedValueOnce(json({ ...PASSWORD_ACCOUNT, emailVerified: false, providers: ["GOOGLE"] }));
    renderAccount();
    expect(await screen.findByText("Sin confirmar")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Formas de entrar" })).toHaveTextContent("Email y contraseñaGoogle");
    expect(screen.queryByRole("heading", { name: "Sesiones" })).not.toBeInTheDocument();
  });

  it("saves the trimmed name", async () => {
    fetchMock.mockResolvedValueOnce(json(PASSWORD_ACCOUNT));
    fetchMock.mockResolvedValueOnce(json({ ...PASSWORD_ACCOUNT, name: "Ana Pérez" }));
    renderAccount();
    const input = await screen.findByLabelText("Nombre");
    await userEvent.clear(input);
    await userEvent.type(input, " Ana Pérez ");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(toast).toHaveBeenCalledWith({ message: "Guardaste tu nombre." });
    expect(bodyOf("/account")).toEqual({ name: "Ana Pérez" });
  });

  it("explains a wrong current password", async () => {
    fetchMock.mockResolvedValueOnce(json(PASSWORD_ACCOUNT));
    fetchMock.mockResolvedValueOnce(json({ error: "Bad Request", message: "x", code: "WRONG_PASSWORD" }, 400));
    renderAccount();
    await userEvent.click(await screen.findByRole("button", { name: "Cambiar la contraseña" }));
    await userEvent.type(screen.getByLabelText("Contraseña actual"), "mal");
    await userEvent.type(screen.getByLabelText("Contraseña nueva"), "una-clave-nueva");
    await userEvent.click(screen.getByRole("button", { name: "Guardar la contraseña" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("La contraseña actual no es correcta.");
    expect(bodyOf("/account/password")).toEqual({ currentPassword: "mal", newPassword: "una-clave-nueva" });
  });

  it("asks the new address to confirm an email change", async () => {
    fetchMock.mockResolvedValueOnce(json(PASSWORD_ACCOUNT));
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 202 }));
    fetchMock.mockResolvedValue(json({ ...PASSWORD_ACCOUNT, pendingEmail: "ana@otro.com" }));
    renderAccount();
    await userEvent.click(await screen.findByRole("button", { name: "Cambiar el email" }));
    await userEvent.type(screen.getByLabelText("Email nuevo"), "ana@otro.com");
    await userEvent.type(screen.getByLabelText("Tu contraseña"), "clave");
    await userEvent.click(screen.getByRole("button", { name: "Mandar el link" }));
    expect(await screen.findByRole("status")).toHaveTextContent("ana@otro.com");
    expect(bodyOf("/account/email")).toEqual({ password: "clave", newEmail: "ana@otro.com" });
  });

  it("hides the email change while emails are off", async () => {
    fetchMock.mockResolvedValueOnce(json(PASSWORD_ACCOUNT));
    renderAccount(false, false);
    expect(await screen.findByRole("button", { name: "Cambiar la contraseña" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cambiar el email" })).not.toBeInTheDocument();
  });

  it("hides the password and email changes of a social account", async () => {
    fetchMock.mockResolvedValueOnce(json({ ...PASSWORD_ACCOUNT, hasPassword: false, providers: ["FACEBOOK"] }));
    renderAccount(true);
    expect(await screen.findByText(/no tiene contraseña/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cambiar la contraseña" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cambiar el email" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cerrar sesión en todos los dispositivos" })).toBeInTheDocument();
  });

  it("offers to retry when the account does not load", async () => {
    fetchMock.mockResolvedValueOnce(json({ error: "x", message: "Server error" }, 500));
    renderAccount();
    expect(await screen.findByText("No pudimos cargar tu cuenta")).toBeInTheDocument();
  });

  it("reads in English", async () => {
    await i18n.changeLanguage("en");
    fetchMock.mockResolvedValueOnce(json({ ...PASSWORD_ACCOUNT, pendingEmail: "ana@otro.com", providers: ["GOOGLE"] }));
    renderAccount(true);
    expect(await screen.findByRole("heading", { level: 1, name: "Your account" })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Sign-in methods" })).toHaveTextContent("Email and passwordGoogle");
    expect(screen.getByText("Confirmed")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "We sent a link to ana@otro.com to confirm the change. Until you open it you keep signing in with ana@negocio.com.",
    );
    expect(screen.getByRole("button", { name: "Change password" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out of all devices" })).toBeInTheDocument();
  });

  it("offers the language setting", async () => {
    fetchMock.mockResolvedValueOnce(json(PASSWORD_ACCOUNT));
    renderAccount();
    expect(await screen.findByRole("heading", { name: "Preferencias" })).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Idioma" }), "en");
    expect(await screen.findByRole("heading", { level: 1, name: "Your account" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Language" })).toHaveValue("en");
  });
});
