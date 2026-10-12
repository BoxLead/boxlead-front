import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { AgentActivityDetail, AgentActivitySummary, AgentResponse, BusinessProfile, CategoryResponse } from "../../api/types";
import { ToastContext } from "../../components/ui/toast";
import { ACTIVITY_KEY, AGENTS_KEY, BUSINESS_PROFILE_KEY, agentActivityKey } from "../../data/agents";
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
  publicCommentReplies: false,
  position: 0,
  scopes: [{ id: "s-1", platform: null, categoryId: "c-1", salesStage: null, replyMode: "AUTO" }],
  createdAt: null,
  updatedAt: null,
};

const quietActivity: AgentActivitySummary = {
  days: 30,
  unassigned: { skipped: 0, labeled: 0 },
  agents: [],
};

const presupuesto: CategoryResponse = {
  id: "c-1",
  name: "Presupuesto",
  description: null,
  color: "BLUE",
  position: 0,
  leadCount: 0,
  createdAt: "",
  updatedAt: "",
};

function query(data: unknown, error: string | null = null, reload: () => void = () => undefined): Query {
  return { data, error, loading: false, reload };
}

function renderAgents() {
  render(
    <MemoryRouter>
      <ToastContext.Provider value={() => undefined}>
        <Agents />
      </ToastContext.Provider>
    </MemoryRouter>,
  );
}

describe("Agents", () => {
  it("offers a retry when categories fail to load", async () => {
    const reload = vi.fn();
    queries.set(AGENTS_KEY, query([agent]));
    queries.set(BUSINESS_PROFILE_KEY, query(profile));
    queries.set(ACTIVITY_KEY, query(quietActivity));
    queries.set(CATEGORIES_KEY, {
      data: undefined,
      error: "No pudimos cargar las categorías.",
      loading: false,
      reload,
    });

    renderAgents();

    expect(screen.getByText("No pudimos cargar las categorías")).toBeInTheDocument();
    expect(screen.getByText(/Categoría/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(reload).toHaveBeenCalled();
  });

  it("shows each agent's last 30 days and the messages no agent took", () => {
    const postventa: AgentResponse = { ...agent, id: "a-2", name: "Postventa", instructions: "", enabled: false };
    queries.set(AGENTS_KEY, query([agent, postventa]));
    queries.set(BUSINESS_PROFILE_KEY, query(profile));
    queries.set(CATEGORIES_KEY, query([presupuesto]));
    queries.set(
      ACTIVITY_KEY,
      query({
        days: 30,
        unassigned: { skipped: 4, labeled: 1 },
        agents: [{ agentId: "a-1", labeled: 2, sent: 8, drafted: 1, skipped: 1, handedOff: 3 }],
      } satisfies AgentActivitySummary),
    );

    renderAgents();

    const ventas = screen.getByRole("region", { name: "Actividad de Ventas, últimos 30 días" });
    expect(ventas).toHaveTextContent("Etiquetados");
    expect(ventas).toHaveTextContent("2");
    expect(ventas).toHaveTextContent("Respondidos");
    expect(ventas).toHaveTextContent("8");
    expect(ventas).toHaveTextContent("Borradores");
    expect(ventas).toHaveTextContent("Omitidos");
    expect(ventas).toHaveTextContent("Derivados");
    expect(ventas).toHaveTextContent("3");
    const paused = screen.getByRole("region", { name: "Actividad de Postventa, últimos 30 días" });
    expect(paused).toHaveTextContent("0");
    expect(screen.getByText("4 mensajes no llegaron a ningún agente y 1 lead se etiquetó sin agente.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Editar Ventas" })).toBeInTheDocument();
  });

  it("keeps the agent editable when activity fails to load", () => {
    queries.set(AGENTS_KEY, query([agent]));
    queries.set(BUSINESS_PROFILE_KEY, query(profile));
    queries.set(CATEGORIES_KEY, query([presupuesto]));
    queries.set(ACTIVITY_KEY, { data: undefined, error: "No pudimos cargar la actividad.", loading: false, reload: () => undefined });

    renderAgents();

    expect(screen.getByText("No pudimos cargar la actividad")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: /Actividad de Ventas/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Editar Ventas" })).toBeEnabled();
  });

  it("opens the recent activity and links a run to the conversation", async () => {
    const detail: AgentActivityDetail = {
      days: 30,
      labeled: 2,
      sent: 8,
      drafted: 0,
      skipped: 1,
      handedOff: 0,
      events: [
        {
          id: "e-1",
          conversationId: "conv-1",
          outcome: "SENT",
          reason: null,
          labeledCategoryId: "c-1",
          createdAt: "2026-10-12T14:00:00.000Z",
        },
        {
          id: "e-2",
          conversationId: null,
          outcome: "SKIPPED",
          reason: "public_comments_disabled",
          labeledCategoryId: null,
          createdAt: "2026-10-12T13:00:00.000Z",
        },
      ],
    };
    queries.set(AGENTS_KEY, query([agent]));
    queries.set(BUSINESS_PROFILE_KEY, query(profile));
    queries.set(CATEGORIES_KEY, query([presupuesto]));
    queries.set(ACTIVITY_KEY, query(quietActivity));
    queries.set(agentActivityKey(agent.id), query(detail));

    renderAgents();
    await userEvent.click(screen.getByRole("button", { name: "Ver actividad de Ventas" }));

    const activity = screen.getByRole("list", { name: "Actividad de Ventas", hidden: true });
    expect(activity).toHaveTextContent("Respondió");
    expect(activity).toHaveTextContent("Etiquetó como Presupuesto");
    expect(activity).toHaveTextContent("Este agente no responde comentarios públicos");
    expect(screen.getByRole("link", { name: "Ver conversación", hidden: true })).toHaveAttribute(
      "href",
      "/app/inbox?id=conv-1",
    );
  });

  it("says when the agent has no activity in the period", async () => {
    const detail: AgentActivityDetail = {
      days: 30,
      labeled: 0,
      sent: 0,
      drafted: 0,
      skipped: 0,
      handedOff: 0,
      events: [],
    };
    queries.set(AGENTS_KEY, query([agent]));
    queries.set(BUSINESS_PROFILE_KEY, query(profile));
    queries.set(CATEGORIES_KEY, query([presupuesto]));
    queries.set(ACTIVITY_KEY, query(quietActivity));
    queries.set(agentActivityKey(agent.id), query(detail));

    renderAgents();
    await userEvent.click(screen.getByRole("button", { name: "Ver actividad de Ventas" }));

    expect(document.querySelector(".agent-activity-empty")?.textContent).toBe(
      "Todavía no hay actividad en los últimos 30 días.",
    );
  });
});
