import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AuthContext, SESSION_FLAGS_OFF, type AuthContextValue } from "../../context/auth";
import { i18n } from "../../i18n";
import { Notifications } from "./Notifications";

vi.mock("../../components/NotificationSettings/NotificationSettings", () => ({ NotificationSettings: () => null }));

const AUTH: AuthContextValue = {
  ...SESSION_FLAGS_OFF,
  features: { ...SESSION_FLAGS_OFF.features, notifications: true },
  user: null,
  login: async () => undefined,
  register: async () => undefined,
  socialLogin: async () => undefined,
  logout: () => undefined,
  refreshUser: async () => undefined,
  isLoading: false,
  error: null,
  clearError: () => undefined,
};

function renderPage() {
  render(
    <MemoryRouter>
      <AuthContext.Provider value={AUTH}>
        <Notifications />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

describe("Notifications", () => {
  it("keeps the Spanish title", () => {
    renderPage();
    expect(screen.getByRole("heading", { level: 1, name: "Notificaciones" })).toBeInTheDocument();
  });

  it("reads in English", async () => {
    await i18n.changeLanguage("en");
    renderPage();
    expect(screen.getByRole("heading", { level: 1, name: "Notifications" })).toBeInTheDocument();
    expect(screen.getByText("Choose how you hear about new leads and conversations waiting for you.")).toBeInTheDocument();
  });
});
