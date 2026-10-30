import { act, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../api/client";
import type { AccountConnectionResponse, AgentResponse, OnboardingResponse } from "../../api/types";
import { AuthContext, SESSION_FLAGS_OFF, type AuthContextValue } from "../../context/auth";
import { AGENTS_KEY } from "../../data/agents";
import { ONBOARDING_KEY, refreshOnboarding } from "../../data/onboarding";
import { clearQueryCache, setQueryFetcher } from "../../data/queryCache";
import { CONNECTIONS_KEY } from "../../hooks/useConnectPlatform";
import { i18n } from "../../i18n";
import { OnboardingChecklist } from "./OnboardingChecklist";

const CONNECTION: AccountConnectionResponse = {
  id: "c-1",
  platform: "WHATSAPP",
  externalAccountId: "1",
  displayName: "Tienda",
  connectedAt: "2026-10-01T00:00:00Z",
  needsReconnection: false,
};

const AGENT: AgentResponse = {
  id: "a-1",
  name: "Ventas",
  instructions: "",
  enabled: true,
  publicCommentReplies: false,
  position: 0,
  scopes: [],
  createdAt: null,
  updatedAt: null,
};

type Answers = {
  connections?: AccountConnectionResponse[] | Error | Promise<never>;
  status?: OnboardingResponse | Error | Promise<never>;
  agents?: AgentResponse[];
};

function session(onboarding: boolean): AuthContextValue {
  return {
    ...SESSION_FLAGS_OFF,
    features: { ...SESSION_FLAGS_OFF.features, onboarding },
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
}

function answer(value: unknown): Promise<unknown> {
  if (value instanceof Promise) return value;
  if (value instanceof Error) return Promise.reject(value);
  return Promise.resolve(value);
}

function serve(answers: Answers) {
  const fetcher = vi.fn((key: string) => {
    if (key === CONNECTIONS_KEY) return answer(answers.connections ?? []);
    if (key === ONBOARDING_KEY) return answer(answers.status ?? { agentCreated: false, agentTested: false });
    if (key === AGENTS_KEY) return answer(answers.agents ?? []);
    return Promise.reject(new ApiError("Not found", 404));
  });
  setQueryFetcher(fetcher);
  return fetcher;
}

function renderChecklist(onboarding = true) {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={session(onboarding)}>
        <OnboardingChecklist />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

function settle() {
  return act(() => new Promise((done) => setTimeout(done, 0)));
}

describe("OnboardingChecklist", () => {
  afterEach(() => {
    setQueryFetcher(null);
    clearQueryCache();
  });

  it("shows nothing and asks for nothing with the flag off", async () => {
    const fetcher = serve({});
    const { container } = renderChecklist(false);
    await settle();
    expect(container).toBeEmptyDOMElement();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("shows nothing while loading", async () => {
    serve({ connections: new Promise<never>(() => undefined) });
    const { container } = renderChecklist();
    await settle();
    expect(container).toBeEmptyDOMElement();
  });

  it("shows nothing when a source fails", async () => {
    serve({ status: new ApiError("Unavailable", 503) });
    const { container } = renderChecklist();
    await settle();
    expect(container).toBeEmptyDOMElement();
  });

  it("never shows up once the three steps are done", async () => {
    serve({ connections: [CONNECTION], status: { agentCreated: true, agentTested: true } });
    const { container } = renderChecklist();
    await settle();
    expect(container).toBeEmptyDOMElement();
  });

  it("lists the three steps for a new account and points to the first one", async () => {
    serve({});
    renderChecklist();
    const panel = await screen.findByRole("region", { name: "Primeros pasos" });
    expect(within(panel).getByText("0 de 3")).toBeInTheDocument();
    expect(within(panel).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
    expect(within(panel).getByRole("link", { name: "Conectar" })).toHaveAttribute("href", "/app/connections");
    expect(within(panel).getByRole("link", { name: "Conectar" })).toHaveClass("btn-primary");
    expect(within(panel).getByRole("link", { name: "Crear" })).toHaveAttribute("href", "/app/agents?id=new");
    expect(within(panel).getByRole("link", { name: "Probar" })).toHaveAttribute("href", "/app/agents");
  });

  it("marks what is done and links the test to the first agent", async () => {
    const fetcher = serve({
      connections: [CONNECTION],
      status: { agentCreated: true, agentTested: false },
      agents: [AGENT, { ...AGENT, id: "a-2", position: 1 }],
    });
    renderChecklist();
    const panel = await screen.findByRole("region", { name: "Primeros pasos" });
    expect(within(panel).getByText("2 de 3")).toBeInTheDocument();
    expect(within(panel).getByText("Conectá un canal")).toHaveTextContent("(hecho)");
    expect(within(panel).queryByRole("link", { name: "Conectar" })).not.toBeInTheDocument();
    expect(within(panel).queryByRole("link", { name: "Crear" })).not.toBeInTheDocument();
    await waitFor(() =>
      expect(within(panel).getByRole("link", { name: "Probar" })).toHaveAttribute("href", "/app/agents?id=a-1&tab=test"),
    );
    expect(fetcher).toHaveBeenCalledWith(AGENTS_KEY);
  });

  it("does not load the agents when they are not needed", async () => {
    const fetcher = serve({ status: { agentCreated: false, agentTested: false } });
    renderChecklist();
    await screen.findByRole("region", { name: "Primeros pasos" });
    expect(fetcher).not.toHaveBeenCalledWith(AGENTS_KEY);
  });

  it("goes away when a refresh says the last step is done", async () => {
    const answers: Answers = { connections: [CONNECTION], status: { agentCreated: true, agentTested: false }, agents: [AGENT] };
    serve(answers);
    renderChecklist();
    expect(await screen.findByText("2 de 3")).toBeInTheDocument();
    answers.status = { agentCreated: true, agentTested: true };
    await act(async () => {
      refreshOnboarding();
    });
    await waitFor(() => expect(screen.queryByRole("region", { name: "Primeros pasos" })).not.toBeInTheDocument());
  });

  it("lists the steps in English", async () => {
    await i18n.changeLanguage("en");
    serve({ connections: [CONNECTION] });
    renderChecklist();
    const panel = await screen.findByRole("region", { name: "Getting started" });
    expect(within(panel).getByText("1 of 3")).toBeInTheDocument();
    expect(within(panel).getByRole("progressbar", { name: "Getting started steps done" })).toHaveAttribute("aria-valuetext", "1 of 3");
    expect(within(panel).getByText("Connect a channel")).toHaveTextContent("(done)");
    expect(within(panel).getByText("Tell it what you sell and how you want it to reply.")).toBeInTheDocument();
    expect(within(panel).getByRole("link", { name: "Create" })).toHaveAttribute("href", "/app/agents?id=new");
    expect(within(panel).getByRole("link", { name: "Test" })).toBeInTheDocument();
  });
});
