import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthUser, SessionFlags } from "../../api/types";
import { AuthContext, SESSION_FLAGS_OFF, sessionFlags, type AuthContextValue } from "../../context/auth";
import { THEME_KEY } from "../../theme/theme";
import { UserMenu } from "./UserMenu";

const named: AuthUser = { ...SESSION_FLAGS_OFF, userId: "u-1", email: "ana@example.com", name: "Ana Pérez" };

function renderMenu(user: AuthUser | null = named) {
  const logout = vi.fn();
  const value: AuthContextValue = {
    ...sessionFlags(user),
    user,
    login: vi.fn(),
    register: vi.fn(),
    socialLogin: vi.fn(),
    logout,
    isLoading: false,
    error: null,
    clearError: vi.fn(),
  };
  render(
    <MemoryRouter>
      <AuthContext.Provider value={value}>
        <UserMenu />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
  return { logout };
}

describe("UserMenu", () => {
  beforeEach(() => {
    document.documentElement.dataset.theme = "dark";
  });

  it("opens the account and shows the name, theme and logout", async () => {
    renderMenu();
    await userEvent.click(screen.getByRole("button", { name: "Cuenta" }));
    const dialog = screen.getByRole("dialog", { name: "Cuenta" });
    expect(within(dialog).getByText("Ana Pérez")).toBeInTheDocument();
    expect(within(dialog).getByText("ana@example.com")).toBeInTheDocument();
    expect(within(dialog).getByRole("switch", { name: "Modo claro" })).not.toBeChecked();
    expect(within(dialog).getByRole("button", { name: "Cerrar sesión" })).toBeInTheDocument();
  });

  it("uses the email alone when there is no name", async () => {
    renderMenu({ ...named, name: null });
    await userEvent.click(screen.getByRole("button", { name: "Cuenta" }));
    const dialog = screen.getByRole("dialog", { name: "Cuenta" });
    expect(within(dialog).getByText("ana@example.com")).toHaveClass("account-menu-name");
    expect(within(dialog).queryByText("Ana Pérez")).not.toBeInTheDocument();
  });

  it("switches the theme on the document and remembers it", async () => {
    renderMenu();
    await userEvent.click(screen.getByRole("button", { name: "Cuenta" }));
    await userEvent.click(screen.getByRole("switch", { name: "Modo claro" }));
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(localStorage.getItem(THEME_KEY)).toBe("light");
    expect(screen.getByRole("switch", { name: "Modo claro" })).toBeChecked();
    expect(screen.getByRole("dialog", { name: "Cuenta" })).toBeInTheDocument();
  });

  it("logs out from the menu", async () => {
    const { logout } = renderMenu();
    await userEvent.click(screen.getByRole("button", { name: "Cuenta" }));
    await userEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    expect(logout).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes on escape and returns focus to the account button", async () => {
    renderMenu();
    const account = screen.getByRole("button", { name: "Cuenta" });
    await userEvent.click(account);
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(account).toHaveFocus();
  });

  it("keeps the menu as today while billing is off", async () => {
    renderMenu();
    await userEvent.click(screen.getByRole("button", { name: "Cuenta" }));
    const dialog = screen.getByRole("dialog", { name: "Cuenta" });
    expect(within(dialog).queryAllByRole("link")).toEqual([]);
  });

  it("links billing, the reseller page and the consumer pages when core enables them", async () => {
    const flags: SessionFlags = { ...SESSION_FLAGS_OFF, features: { billing: true, referrals: true }, isReseller: true };
    renderMenu({ ...named, ...flags });
    await userEvent.click(screen.getByRole("button", { name: "Cuenta" }));
    const dialog = screen.getByRole("dialog", { name: "Cuenta" });
    expect(within(dialog).getByRole("link", { name: "Facturación" })).toHaveAttribute("href", "/app/billing");
    expect(within(dialog).getByRole("link", { name: "Revendedor" })).toHaveAttribute("href", "/app/reseller");
    expect(within(dialog).getByRole("link", { name: "Botón de arrepentimiento" })).toHaveAttribute("href", "/arrepentimiento");
    expect(within(dialog).getByRole("link", { name: "Botón de baja de servicio" })).toHaveAttribute("href", "/baja");

    await userEvent.click(within(dialog).getByRole("link", { name: "Facturación" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes when clicking outside", async () => {
    renderMenu();
    await userEvent.click(screen.getByRole("button", { name: "Cuenta" }));
    await userEvent.click(document.body);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
