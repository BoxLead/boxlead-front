import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { AuthUser } from "../api/types";
import { AuthContext, sessionFlags, type AuthContextValue } from "../context/auth";
import { ProtectedRoute } from "./ProtectedRoute";

const USER: AuthUser = {
  userId: "u-1",
  email: "ana@example.com",
  name: "Ana",
  features: { billing: false, referrals: false, legal: false },
  access: "FULL",
  isReseller: false,
  pendingLegal: [],
};

function Where() {
  const location = useLocation();
  return <p>{`${location.pathname}${location.search}`}</p>;
}

function renderAt(path: string, user: AuthUser | null) {
  const noop = () => undefined;
  const value: AuthContextValue = {
    ...sessionFlags(user),
    user,
    login: () => Promise.resolve(),
    register: () => Promise.resolve(),
    socialLogin: () => Promise.resolve(),
    logout: noop,
    refreshUser: () => Promise.resolve(),
    isLoading: false,
    error: null,
    clearError: noop,
  };
  return render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/login" element={<Where />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/app/*" element={<p>privado</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe("ProtectedRoute", () => {
  it("never lets an anonymous visitor into the app and keeps where they were going", () => {
    renderAt("/app/leads?status=NEW", null);
    expect(screen.queryByText("privado")).not.toBeInTheDocument();
    expect(screen.getByText("/login?next=%2Fapp%2Fleads%3Fstatus%3DNEW")).toBeInTheDocument();
  });

  it("renders the app for a signed in user", () => {
    renderAt("/app/leads", USER);
    expect(screen.getByText("privado")).toBeInTheDocument();
  });
});
