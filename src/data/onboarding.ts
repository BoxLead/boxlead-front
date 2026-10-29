import type { AccountConnectionResponse, AgentResponse, OnboardingResponse } from "../api/types";
import { AGENT_KEY_PREFIX, invalidateQueries } from "./queryCache";

export const ONBOARDING_KEY = `${AGENT_KEY_PREFIX}/onboarding`;

export type OnboardingStepId = "channel" | "agent" | "test";

export type OnboardingStep = {
  id: OnboardingStepId;
  title: string;
  text: string;
  action: string;
  to: string;
  done: boolean;
};

export type OnboardingSources = {
  connections: AccountConnectionResponse[] | undefined;
  status: OnboardingResponse | undefined;
  agents: AgentResponse[] | undefined;
};

export function refreshOnboarding(): void {
  void invalidateQueries(ONBOARDING_KEY);
}

export function needsAgents(status: OnboardingResponse | undefined): boolean {
  return status?.agentCreated === true && status.agentTested !== true;
}

function testPath(agents: AgentResponse[] | undefined): string {
  const first = agents?.[0];
  if (!first) return "/app/agents";
  const params = new URLSearchParams({ id: first.id, tab: "test" });
  return `/app/agents?${params.toString()}`;
}

export function onboardingSteps({ connections, status, agents }: OnboardingSources): OnboardingStep[] | null {
  if (!Array.isArray(connections) || !status || typeof status !== "object") return null;
  return [
    {
      id: "channel",
      title: "Conectá un canal",
      text: "Así los mensajes de tus clientes llegan a la bandeja.",
      action: "Conectar",
      to: "/app/connections",
      done: connections.length > 0,
    },
    {
      id: "agent",
      title: "Creá tu agente",
      text: "Contale qué vendés y cómo querés que responda.",
      action: "Crear",
      to: "/app/agents?id=new",
      done: status.agentCreated === true,
    },
    {
      id: "test",
      title: "Probá tu agente",
      text: "Mandale una consulta de prueba y mirá cómo contesta.",
      action: "Probar",
      to: testPath(agents),
      done: status.agentTested === true,
    },
  ];
}
