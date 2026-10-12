import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { AgentResponse, BusinessProfile } from "../../api/types";
import { ToastContext } from "../../components/ui/toast";
import { AGENTS_KEY, BUSINESS_PROFILE_KEY } from "../../data/agents";
import { CATEGORIES_KEY } from "../../data/categories";
import { Agents } from "./Agents";

type Query = {
  data: unknown;
  error: string | null;
  loading: boolean;
  reload: () => void;
};

const queries = new Map<string, Query>();

vi.mock("../../hooks/useApiQuery", () => ({
  useApiQuery: (key: string | null) =>
    queries.get(key ?? "") ?? { data: undefined, error: null, loading: true, reload: () => undefined },
}));

const profile: BusinessProfile = { description: "Vendemos audio", tone: null, autoCategorize: false };

const agent: AgentResponse = {
  id: "a-1",
  name: "Ventas",
  instructions: "Sé breve",
  enabled: true,
  position: 0,
  scopes: [{ id: "s-1", platform: null, categoryId: "c-1", salesStage: null, replyMode: "AUTO" }],
  createdAt: null,
  updatedAt: null,
};

describe("Agents", () => {
  it("offers a retry when categories fail to load", async () => {
    const reload = vi.fn();
    queries.set(AGENTS_KEY, { data: [agent], error: null, loading: false, reload: () => undefined });
    queries.set(BUSINESS_PROFILE_KEY, { data: profile, error: null, loading: false, reload: () => undefined });
    queries.set(CATEGORIES_KEY, {
      data: undefined,
      error: "No pudimos cargar las categorías.",
      loading: false,
      reload,
    });

    render(
      <ToastContext.Provider value={() => undefined}>
        <Agents />
      </ToastContext.Provider>,
    );

    expect(screen.getByText("No pudimos cargar las categorías")).toBeInTheDocument();
    expect(screen.getByText(/Categoría/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(reload).toHaveBeenCalled();
  });
});
