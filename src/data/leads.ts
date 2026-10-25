import { api } from "../api/client";
import type { LeadResponse, LeadStatus, LeadTemperature } from "../api/types";
import { getQueryState, invalidateQueries, setQueryData } from "./queryCache";

export const ALL_LEADS_KEY = "/leads?includePostSale=true";

export function leadKey(id: string): string {
  return `/leads/${id}`;
}

function replaceLead(lead: LeadResponse) {
  setQueryData<LeadResponse[]>(ALL_LEADS_KEY, (current) =>
    (current ?? []).map((item) => (item.id === lead.id ? lead : item)),
  );
  setQueryData<LeadResponse>(leadKey(lead.id), () => lead);
}

export async function deleteLead(id: string): Promise<void> {
  await api.delete(leadKey(id));
  setQueryData<LeadResponse[]>(ALL_LEADS_KEY, (current) => (current ?? []).filter((lead) => lead.id !== id));
  void invalidateQueries("/leads");
  void invalidateQueries("/conversations");
}

export async function updateLeadStatus(lead: LeadResponse, status: LeadStatus): Promise<LeadResponse> {
  const previous = getQueryState<LeadResponse>(leadKey(lead.id)).data ?? lead;
  replaceLead({ ...lead, status });
  try {
    const saved = await api.patch<LeadResponse>(leadKey(lead.id), { status });
    replaceLead(saved);
    void invalidateQueries("/leads");
    return saved;
  } catch (error) {
    replaceLead(previous);
    throw error;
  }
}

export async function assignLeadTemperature(
  lead: LeadResponse,
  temperature: LeadTemperature | null,
): Promise<LeadResponse> {
  const previous = getQueryState<LeadResponse>(leadKey(lead.id)).data ?? lead;
  replaceLead({ ...lead, temperature });
  try {
    const saved = await api.put<LeadResponse>(`${leadKey(lead.id)}/temperature`, { temperature });
    replaceLead(saved);
    void invalidateQueries("/metrics");
    return saved;
  } catch (error) {
    replaceLead(previous);
    throw error;
  }
}
