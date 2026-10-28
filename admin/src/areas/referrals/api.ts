import { adminApi } from "../../api/client";
import { AdminApiError } from "../../api/errors";
import { isDay, RANGE_PROBLEM } from "../../components/list/filterRules";
import type { AdminPage, Money } from "../../api/types";
import type { Attribution, Commission, CustomerMatch, NewReseller, Payout, ReferralCode, Reseller } from "./types";

const NOT_RELEASABLE = "COMMISSION_NOT_RELEASABLE";

export type CommissionAction = "hold" | "release" | "reverse";

const ACTION_REFUSED: Record<CommissionAction | "approve", string> = {
  approve: "Alguna comisión ya no está devengada o todavía no llegó a su fecha de liberación. Recargá y probá de nuevo.",
  hold: "Esta comisión ya no se puede retener. Recargá para ver su estado.",
  release: "Esta comisión no se puede liberar. O ya no está retenida o es una autorreferencia, que queda retenida. Recargá para ver su estado.",
  reverse: "Esta comisión no se puede revertir.",
};

async function explained<T>(action: CommissionAction | "approve", call: Promise<T>): Promise<T> {
  try {
    return await call;
  } catch (error) {
    if (error instanceof AdminApiError && error.code === NOT_RELEASABLE) {
      throw new AdminApiError(ACTION_REFUSED[action], error.status, error.code);
    }
    throw error;
  }
}

export const referralsApi = {
  createReseller: (reseller: NewReseller, reason: string) => adminApi.post<Reseller>("/admin/resellers", { ...reseller, reason }),
  issueCode: (resellerId: string, reason: string) =>
    adminApi.post<ReferralCode>(`/admin/resellers/${encodeURIComponent(resellerId)}/codes`, { reason }),
  disableCode: (codeId: string, reason: string) =>
    adminApi.post<ReferralCode>(`/admin/referral-codes/${encodeURIComponent(codeId)}/disable`, { reason }),
  correctAttribution: (userId: string, resellerId: string, reason: string) =>
    adminApi.post<Attribution>(`/admin/customers/${encodeURIComponent(userId)}/attribution`, { resellerId, reason }),
  approve: (ids: readonly string[], reason: string) =>
    explained("approve", adminApi.post<Commission[]>("/admin/commissions/approve", { ids, reason })),
  changeCommission: (action: CommissionAction, id: string, reason: string) =>
    explained(action, adminApi.post<Commission>(`/admin/commissions/${encodeURIComponent(id)}/${action}`, { reason })),
  createPayout: (resellerId: string, periodEnd: string, reason: string) =>
    adminApi.post<Payout>("/admin/payouts", { resellerId, periodEnd, reason }),
  markPaid: (payoutId: string, transferReference: string | null, reason: string) =>
    adminApi.post<Payout>(`/admin/payouts/${encodeURIComponent(payoutId)}/paid`, { transferReference, reason }),
  exportPayout: (payoutId: string, reason: string) =>
    adminApi.postBlob(`/admin/payouts/${encodeURIComponent(payoutId)}/export`, { reason }),
  commissions: (query: URLSearchParams) => adminApi.get<AdminPage<Commission>>("/admin/commissions", { query }),
  searchCustomers: (query: string, signal?: AbortSignal) =>
    adminApi.get<AdminPage<CustomerMatch>>("/admin/customers", { query: new URLSearchParams({ query }), signal }),
};

export function payoutFileName(payout: Payout): string {
  return `liquidacion-${payout.periodEnd}-${payout.id}.csv`;
}

const REVOKE_AFTER_MS = 10_000;

export function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), REVOKE_AFTER_MS);
}

export async function downloadPayout(payout: Payout, reason: string): Promise<void> {
  const blob = await referralsApi.exportPayout(payout.id, reason);
  saveBlob(blob, payoutFileName(payout));
}

export function totalsByCurrency(amounts: readonly Money[]): Money[] {
  const totals = new Map<string, number>();
  for (const amount of amounts) totals.set(amount.currency, (totals.get(amount.currency) ?? 0) + amount.amountMinor);
  return [...totals.entries()].map(([currency, amountMinor]) => ({ currency, amountMinor }));
}

export function isReleasable(commission: Commission, now = Date.now()): boolean {
  return commission.status === "ACCRUED" && Date.parse(commission.releaseAt) <= now;
}

export function canHold(commission: Commission): boolean {
  return (commission.status === "ACCRUED" || commission.status === "APPROVED") && commission.payoutId === null;
}

export function canRelease(commission: Commission): boolean {
  return commission.status === "HELD";
}

export function canReverse(commission: Commission): boolean {
  return commission.kind === "ACCRUAL" && commission.status !== "REVERSED";
}

const BUENOS_AIRES_OFFSET = "-03:00";

export function todayInBuenosAires(now = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
}

const FORMAT_PROBLEM = "Una de las fechas no tiene el formato correcto.";
const FUTURE_START = "Sin fecha de fin el período termina hoy, así que la de inicio no puede ser posterior.";

export function clickRangeProblem(from: string, to: string, today: string): string | null {
  if ((from && !isDay(from)) || (to && !isDay(to))) return FORMAT_PROBLEM;
  if (!from) return null;
  if (to) return from > to ? RANGE_PROBLEM : null;
  return from > today ? FUTURE_START : null;
}

export function releasedBy(commission: Commission, periodEnd: string): boolean {
  const end = Date.parse(`${periodEnd}T00:00:00${BUENOS_AIRES_OFFSET}`) + 24 * 60 * 60 * 1000;
  return Date.parse(commission.releaseAt) < end;
}

const MAX_PAGES = 20;

export async function payableCommissions(resellerId: string, periodEnd: string): Promise<Commission[]> {
  const found: Commission[] = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const query = new URLSearchParams({ status: "APPROVED", resellerId });
    if (page > 0) query.set("page", String(page));
    const result = await referralsApi.commissions(query);
    found.push(...result.items);
    if ((page + 1) * result.size >= result.totalItems || result.items.length === 0) break;
  }
  return found.filter((commission) => commission.payoutId === null && releasedBy(commission, periodEnd));
}
