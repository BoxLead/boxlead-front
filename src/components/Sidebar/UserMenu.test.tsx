import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthUser } from "../../api/types";
import { AuthContext, type AuthContextValue } from "../../context/auth";
import { THEME_KEY } from "../../theme/theme";
import { UserMenu } from "./UserMenu";

const named: AuthUser = { userId: "u-1", email: "ana@example.com", name: "Ana Pérez" };

function renderMenu(user: AuthUser | null = named) {
  const logout = vi.fn();
  const value: AuthContextValue = {
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
    <AuthContext.Provider value={value}>
      <UserMenu />
    </AuthContext.Provider>,
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
    renderMenu({ userId: "u-1", email: "ana@example.com", name: null });
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

  it("closes when clicking outside", async () => {
    renderMenu();
    await userEvent.click(screen.getByRole("button", { name: "Cuenta" }));
    await userEvent.click(document.body);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
