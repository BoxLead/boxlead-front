import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AuthContext, type AuthContextValue } from "../context/auth";
import { FeatureRoute } from "./FeatureRoute";

function session(billing: boolean, isReseller: boolean): AuthContextValue {
  return {
    user: null,
    features: { billing, referrals: isReseller, legal: false, clientErrors: false, onboarding: false, notifications: false },
    access: "FULL",
    isReseller,
    pendingLegal: [],
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

function renderAt(path: string, billing: boolean, isReseller = false) {
  render(
    <AuthContext.Provider value={session(billing, isReseller)}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/" element={<p>landing</p>} />
          <Route path="/app" element={<p>app</p>} />
          <Route element={<FeatureRoute feature="billing" />}>
            <Route path="/app/billing" element={<p>facturación</p>} />
          </Route>
          <Route element={<FeatureRoute feature="reseller" />}>
            <Route path="/app/reseller" element={<p>revendedor</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe("FeatureRoute", () => {
  it("sends a hidden billing page to the app and not to the landing", () => {
    renderAt("/app/billing", false);
    expect(screen.getByText("app")).toBeInTheDocument();
    expect(screen.queryByText("landing")).not.toBeInTheDocument();
  });

  it("does the same with the reseller page", () => {
    renderAt("/app/reseller", true, false);
    expect(screen.getByText("app")).toBeInTheDocument();
  });

  it("opens the page when its flag is on", () => {
    renderAt("/app/billing", true);
    expect(screen.getByText("facturación")).toBeInTheDocument();
    renderAt("/app/reseller", false, true);
    expect(screen.getByText("revendedor")).toBeInTheDocument();
  });
});
