import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ACCOUNT_FEATURES_OFF } from "../../api/client";
import type { AuthUser } from "../../api/types";
import { AuthContext, SESSION_FLAGS_OFF, type AuthContextValue } from "../../context/auth";
import { i18n } from "../../i18n";
import { EmailVerificationGate } from "./EmailVerificationGate";

const fetchMock = vi.fn<typeof fetch>();

function session(settings: boolean, overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  const user: AuthUser = {
    ...SESSION_FLAGS_OFF,
    userId: "u-1",
    email: "nuevo@negocio.com",
    name: null,
    account: { ...ACCOUNT_FEATURES_OFF, emailVerification: true, settings },
    emailVerificationPending: true,
  };
  return {
    ...SESSION_FLAGS_OFF,
    user,
    login: async () => undefined,
    register: async () => undefined,
    socialLogin: async () => undefined,
    logout: vi.fn(),
    refreshUser: vi.fn(async () => undefined),
    isLoading: false,
    error: null,
    clearError: () => undefined,
    ...overrides,
  };
}

function renderGate(value: AuthContextValue) {
  render(
    <MemoryRouter>
      <AuthContext.Provider value={value}>
        <EmailVerificationGate />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("email verification gate", () => {
  it("shows the email and sends the link again", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 202 }));
    renderGate(session(false));
    expect(screen.getByText("nuevo@negocio.com")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Mandar el link de nuevo" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Te mandamos un link nuevo");
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/account\/email\/verification$/);
  });

  it("explains a resend limit", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Too many requests", message: "Too many requests" }), { status: 429 }),
    );
    renderGate(session(false));
    await userEvent.click(screen.getByRole("button", { name: "Mandar el link de nuevo" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("demasiados intentos");
  });

  it("checks the session again and lets the person sign out", async () => {
    const value = session(false);
    renderGate(value);
    await userEvent.click(screen.getByRole("button", { name: "Ya lo confirmé" }));
    expect(value.refreshUser).toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    expect(value.logout).toHaveBeenCalled();
  });

  it("offers to fix the email only when the account page is on", () => {
    renderGate(session(false));
    expect(screen.queryByRole("link", { name: "Corregilo desde tu cuenta" })).not.toBeInTheDocument();
  });

  it("links to the account page when it is on", () => {
    renderGate(session(true));
    expect(screen.getByRole("link", { name: "Corregilo desde tu cuenta" })).toHaveAttribute("href", "/app/cuenta");
  });
});

describe("email verification gate in English", () => {
  it("asks to confirm the email in English", async () => {
    await i18n.changeLanguage("en");
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 202 }));
    renderGate(session(true));
    expect(screen.getByRole("heading", { name: "Confirm your email" })).toBeInTheDocument();
    expect(screen.getByText(/The link expires in 2 hours/)).toHaveTextContent("We sent a link to nuevo@negocio.com.");
    expect(screen.getByRole("link", { name: "Fix it from your account" })).toHaveAttribute("href", "/app/cuenta");
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Send the link again" }));
    expect(await screen.findByRole("status")).toHaveTextContent("We sent you a new link.");
  });
});
