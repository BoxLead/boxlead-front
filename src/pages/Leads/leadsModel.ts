import type { LeadResponse, LeadStatus, PlatformType } from "../../api/types";
import { UNCATEGORIZED } from "../../util/categories";
import { LEAD_STATUSES, leadDisplayName } from "../../util/labels";

export type LeadFilters = {
  status: LeadStatus | null;
  channel: PlatformType | "ALL";
  includeBuyers: boolean;
  category: string | null;
  query: string;
};

function matchesCategory(lead: LeadResponse, category: string | null): boolean {
  if (category === null) return true;
  if (category === UNCATEGORIZED) return !lead.categoryId;
  return lead.categoryId === category;
}

function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("es-AR");
}

export function filterLeads(leads: LeadResponse[], filters: LeadFilters): LeadResponse[] {
  const query = normalize(filters.query.trim());
  const digits = filters.query.replace(/\D/g, "");
  return leads
    .filter(
      (lead) =>
        (filters.includeBuyers || !lead.postSaleOnly) &&
        (!filters.status || lead.status === filters.status) &&
        (filters.channel === "ALL" || lead.platform === filters.channel) &&
        matchesCategory(lead, filters.category) &&
        (!query ||
          normalize(leadDisplayName(lead)).includes(query) ||
          normalize(lead.email ?? "").includes(query) ||
          (digits.length >= 3 && (lead.phone ?? "").replace(/\D/g, "").includes(digits))),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function statusCounts(leads: LeadResponse[]): Record<LeadStatus, number> {
  const counts = Object.fromEntries(LEAD_STATUSES.map((s) => [s, 0])) as Record<LeadStatus, number>;
  for (const lead of leads) counts[lead.status] += 1;
  return counts;
}
