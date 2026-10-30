import i18next from "i18next";
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
      title: i18next.t("onboarding.channel.title", { ns: "shell" }),
      text: i18next.t("onboarding.channel.text", { ns: "shell" }),
      action: i18next.t("onboarding.channel.action", { ns: "shell" }),
      to: "/app/connections",
      done: connections.length > 0,
    },
    {
      id: "agent",
      title: i18next.t("onboarding.agent.title", { ns: "shell" }),
      text: i18next.t("onboarding.agent.text", { ns: "shell" }),
      action: i18next.t("onboarding.agent.action", { ns: "shell" }),
      to: "/app/agents?id=new",
      done: status.agentCreated === true,
    },
    {
      id: "test",
      title: i18next.t("onboarding.test.title", { ns: "shell" }),
      text: i18next.t("onboarding.test.text", { ns: "shell" }),
      action: i18next.t("onboarding.test.action", { ns: "shell" }),
      to: testPath(agents),
      done: status.agentTested === true,
    },
  ];
}
