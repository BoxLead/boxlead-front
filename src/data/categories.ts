import { api } from "../api/client";
import type {
  CategoryResponse,
  CreateCategoryRequest,
  LeadResponse,
  UpdateCategoryRequest,
} from "../api/types";
import { ALL_LEADS_KEY, leadKey } from "./leads";
import { getQueryState, invalidateQueries, setQueryData } from "./queryCache";

export const CATEGORIES_KEY = "/categories";

function replaceLead(lead: LeadResponse) {
  setQueryData<LeadResponse[]>(ALL_LEADS_KEY, (current) =>
    (current ?? []).map((item) => (item.id === lead.id ? lead : item)),
  );
  setQueryData<LeadResponse>(leadKey(lead.id), () => lead);
}

export async function createCategory(body: CreateCategoryRequest): Promise<CategoryResponse> {
  const created = await api.post<CategoryResponse>(CATEGORIES_KEY, body);
  setQueryData<CategoryResponse[]>(CATEGORIES_KEY, (current) => [...(current ?? []), created]);
  return created;
}

export async function updateCategory(id: string, body: UpdateCategoryRequest): Promise<CategoryResponse> {
  const saved = await api.patch<CategoryResponse>(`${CATEGORIES_KEY}/${id}`, body);
  setQueryData<CategoryResponse[]>(CATEGORIES_KEY, (current) =>
    (current ?? []).map((category) => (category.id === id ? saved : category)),
  );
  return saved;
}

export async function deleteCategory(id: string): Promise<void> {
  await api.delete(`${CATEGORIES_KEY}/${id}`);
  setQueryData<CategoryResponse[]>(CATEGORIES_KEY, (current) =>
    (current ?? []).filter((category) => category.id !== id),
  );
  setQueryData<LeadResponse[]>(ALL_LEADS_KEY, (current) =>
    (current ?? []).map((lead) => (lead.categoryId === id ? { ...lead, categoryId: null } : lead)),
  );
  void invalidateQueries("/leads");
}

export async function assignLeadCategory(lead: LeadResponse, categoryId: string | null): Promise<LeadResponse> {
  const previous = getQueryState<LeadResponse>(leadKey(lead.id)).data ?? lead;
  replaceLead({ ...lead, categoryId });
  try {
    const saved = await api.put<LeadResponse>(`${leadKey(lead.id)}/category`, { categoryId });
    replaceLead(saved);
    void invalidateQueries(CATEGORIES_KEY);
    return saved;
  } catch (error) {
    replaceLead(previous);
    throw error;
  }
}
