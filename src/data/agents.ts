import { agentApi } from "../api/client";
import type { AgentRequest, AgentResponse, BusinessProfile } from "../api/types";
import { toAgentRequest } from "../util/agents";
import { AGENT_KEY_PREFIX, setQueryData } from "./queryCache";

const AGENTS_PATH = "/agents";
const BUSINESS_PROFILE_PATH = "/business-profile";

export const AGENTS_KEY = `${AGENT_KEY_PREFIX}${AGENTS_PATH}`;
export const BUSINESS_PROFILE_KEY = `${AGENT_KEY_PREFIX}${BUSINESS_PROFILE_PATH}`;

function sortByPosition(agents: AgentResponse[]): AgentResponse[] {
  return [...agents].sort((a, b) => a.position - b.position);
}

export function replaceAgent(agent: AgentResponse) {
  setQueryData<AgentResponse[]>(AGENTS_KEY, (current) =>
    (current ?? []).map((item) => (item.id === agent.id ? agent : item)),
  );
}

export async function createAgent(body: AgentRequest): Promise<AgentResponse> {
  const created = await agentApi.post<AgentResponse>(AGENTS_PATH, body);
  setQueryData<AgentResponse[]>(AGENTS_KEY, (current) => sortByPosition([...(current ?? []), created]));
  return created;
}

export async function updateAgent(id: string, body: AgentRequest): Promise<AgentResponse> {
  const saved = await agentApi.put<AgentResponse>(`${AGENTS_PATH}/${id}`, body);
  replaceAgent(saved);
  return saved;
}

export async function setAgentEnabled(agent: AgentResponse, enabled: boolean): Promise<AgentResponse> {
  replaceAgent({ ...agent, enabled });
  try {
    const saved = await agentApi.put<AgentResponse>(`${AGENTS_PATH}/${agent.id}`, toAgentRequest(agent, { enabled }));
    replaceAgent(saved);
    return saved;
  } catch (error) {
    replaceAgent(agent);
    throw error;
  }
}

export async function deleteAgent(id: string): Promise<void> {
  await agentApi.delete(`${AGENTS_PATH}/${id}`);
  setQueryData<AgentResponse[]>(AGENTS_KEY, (current) => (current ?? []).filter((agent) => agent.id !== id));
}

export async function saveBusinessProfile(profile: BusinessProfile): Promise<BusinessProfile> {
  const saved = await agentApi.put<BusinessProfile>(BUSINESS_PROFILE_PATH, profile);
  setQueryData<BusinessProfile>(BUSINESS_PROFILE_KEY, () => saved);
  return saved;
}
