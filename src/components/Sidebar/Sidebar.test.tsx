import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { i18n } from "../../i18n";
import { AuthContext, SESSION_FLAGS_OFF, type AuthContextValue } from "../../context/auth";
import { SIDEBAR_KEY } from "../../theme/theme";
import { Sidebar } from "./Sidebar";

const auth: AuthContextValue = {
  ...SESSION_FLAGS_OFF,
  user: { ...SESSION_FLAGS_OFF, userId: "u-1", email: "ana@example.com", name: "Ana Pérez" },
  login: vi.fn(),
  register: vi.fn(),
  socialLogin: vi.fn(),
  logout: vi.fn(),
  refreshUser: vi.fn(),
  isLoading: false,
  error: null,
  clearError: vi.fn(),
};

function renderSidebar() {
  render(
    <MemoryRouter initialEntries={["/app/inbox"]}>
      <AuthContext.Provider value={auth}>
        <Sidebar />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

describe("Sidebar", () => {
  it("collapses to an icon rail and keeps the link names", async () => {
    renderSidebar();
    const inbox = screen.getByRole("link", { name: "Bandeja" });
    expect(inbox).not.toHaveAttribute("title");

    await userEvent.click(screen.getByRole("button", { name: "Contraer menú" }));

    expect(document.documentElement.dataset.sidebar).toBe("collapsed");
    expect(localStorage.getItem(SIDEBAR_KEY)).toBe("collapsed");
    expect(screen.getByRole("link", { name: "Bandeja" })).toHaveAttribute("title", "Bandeja");
    expect(screen.getByRole("link", { name: "BoxLead" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Expandir menú" }));
    expect(document.documentElement.dataset.sidebar).toBe("expanded");
    expect(screen.getByRole("link", { name: "Bandeja" })).not.toHaveAttribute("title");
  });
});

describe("Sidebar in English", () => {
  it("names the sections and the toggle in English", async () => {
    await i18n.changeLanguage("en");
    renderSidebar();
    expect(screen.getByRole("complementary", { name: "Main navigation" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Inbox" })).toHaveAttribute("href", "/app/inbox");
    expect(screen.getByRole("link", { name: "Connections" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Collapse menu" }));
    expect(screen.getByRole("link", { name: "Metrics" })).toHaveAttribute("title", "Metrics");
    expect(screen.getByRole("button", { name: "Expand menu" })).toBeInTheDocument();
  });
});
