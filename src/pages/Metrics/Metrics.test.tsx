import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../api/client";
import type { BillingSummary } from "../../api/types";
import { ToastContext } from "../../components/ui/toast";
import { AuthContext, type AuthContextValue } from "../../context/auth";
import { BILLING_SUMMARY_KEY } from "../../data/billing";
import { clearQueryCache, setQueryFetcher } from "../../data/queryCache";
import { Metrics } from "./Metrics";

const PLAN_LIMIT = { error: "Payment Required", message: "Limit", code: "PLAN_LIMIT_REACHED" };

function noPlan(days: number): BillingSummary {
  return {
    access: "RESTRICTED",
    plan: null,
    subscription: null,
    demo: null,
    checkout: null,
    usage: { agentReplies: { used: 0, limit: 0 }, periodEnd: "2026-11-28T03:00:00Z" },
    limits: { METRICS_HISTORY_DAYS: days },
    billingProfileComplete: false,
  };
}

function session(billing: boolean): AuthContextValue {
  return {
    user: null,
    features: { billing, referrals: false, legal: false },
    access: billing ? "RESTRICTED" : "FULL",
    isReseller: false,
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

function renderMetrics(billing: boolean) {
  render(
    <MemoryRouter initialEntries={["/app/metrics"]}>
      <AuthContext.Provider value={session(billing)}>
        <ToastContext.Provider value={() => undefined}>
          <Metrics />
        </ToastContext.Provider>
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

describe("Metrics and the plan", () => {
  afterEach(() => {
    setQueryFetcher(null);
    clearQueryCache();
  });

  it("explains a 402 in its own notice instead of the loading error", async () => {
    setQueryFetcher(async (key) => {
      if (key.startsWith("/metrics?")) throw new ApiError("Llegaste al límite de tu plan.", 402, PLAN_LIMIT);
      if (key === "/metrics/settings") return { manualReplyMinutes: 4, businessHours: null };
      return [];
    });
    renderMetrics(false);
    expect(await screen.findByText("Tu plan no cubre este período")).toBeInTheDocument();
    expect(screen.getByText("Elegí un período más corto o pasate a un plan con más días de historial.")).toBeInTheDocument();
    expect(screen.queryByText("No pudimos cargar las métricas")).not.toBeInTheDocument();
    expect(screen.queryByText("Llegaste al límite de tu plan.")).not.toBeInTheDocument();
  });

  it("asks for no period when the plan history does not fit the shortest one", async () => {
    const fetcher = vi.fn(async (key: string) => {
      if (key === BILLING_SUMMARY_KEY) return noPlan(0);
      if (key === "/metrics/settings") return { manualReplyMinutes: 4, businessHours: null };
      return [];
    });
    setQueryFetcher(fetcher);
    renderMetrics(true);
    expect(await screen.findByText("Tu plan no incluye historial de métricas")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver planes" })).toHaveAttribute("href", "/app/billing");
    expect(screen.queryByRole("group", { name: "Período" })).not.toBeInTheDocument();
    expect(fetcher.mock.calls.map(([key]) => key).filter((key) => key.startsWith("/metrics?"))).toEqual([]);
  });
});
