import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../api/client";
import type { BillingSummary } from "../../api/types";
import { AuthContext, SESSION_FLAGS_OFF, type AuthContextValue } from "../../context/auth";
import { BILLING_SUMMARY_KEY, CURRENT_INVITATION_KEY } from "../../data/billing";
import { clearQueryCache, setQueryFetcher } from "../../data/queryCache";
import { i18n } from "../../i18n";
import { ToastContext } from "../ui/toast";
import { PlanBanner } from "./PlanBanner";

const summary: BillingSummary = {
  access: "RESTRICTED",
  plan: null,
  subscription: null,
  demo: null,
  checkout: null,
  usage: { agentReplies: { used: 0, limit: null }, periodEnd: "2026-11-28T12:00:00Z" },
  limits: {},
  billingProfileComplete: true,
};

const auth: AuthContextValue = {
  ...SESSION_FLAGS_OFF,
  features: { ...SESSION_FLAGS_OFF.features, billing: true },
  user: { ...SESSION_FLAGS_OFF, userId: "u-1", email: "ana@negocio.com", name: "Ana" },
  login: vi.fn(),
  register: vi.fn(),
  socialLogin: vi.fn(),
  logout: vi.fn(),
  refreshUser: vi.fn(),
  isLoading: false,
  error: null,
  clearError: vi.fn(),
};

function renderBanner() {
  setQueryFetcher((key: string) => {
    if (key === BILLING_SUMMARY_KEY) return Promise.resolve(summary);
    if (key === CURRENT_INVITATION_KEY) return Promise.resolve({ email: "otra@negocio.com", expiresAt: "2026-12-01T12:00:00Z" });
    return Promise.reject(new ApiError("Not found", 404));
  });
  render(
    <MemoryRouter>
      <AuthContext.Provider value={auth}>
        <ToastContext.Provider value={vi.fn()}>
          <PlanBanner />
        </ToastContext.Provider>
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

describe("PlanBanner", () => {
  afterEach(() => {
    setQueryFetcher(null);
    clearQueryCache();
  });

  it("explains the missing plan and the invitation in English", async () => {
    await i18n.changeLanguage("en");
    renderBanner();
    expect(await screen.findByText("You don't have an active plan")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Choose a plan" })).toHaveAttribute("href", "/app/billing");
    expect(await screen.findByText("You're invited to the Beta")).toBeInTheDocument();
    expect(screen.getByText("The invitation is for otra@negocio.com, but you signed in as ana@negocio.com.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Activate the Beta" })).toBeInTheDocument();
  });
});
