import type { CommissionEntry, CommissionStatus, CommissionTotal, ReferralCode } from "../api/types";

export const REFERRALS_KEY = "/referrals/me";

export const COMMISSION_STATUSES: CommissionStatus[] = ["ACCRUED", "HELD", "APPROVED", "PAID", "REVERSED"];

function statusRank(status: CommissionStatus): number {
  const index = COMMISSION_STATUSES.indexOf(status);
  return index === -1 ? COMMISSION_STATUSES.length : index;
}

export function activeCodes(codes: ReferralCode[]): ReferralCode[] {
  return codes.filter((code) => code.status === "ACTIVE");
}

export function sortTotals(totals: CommissionTotal[]): CommissionTotal[] {
  return [...totals].sort(
    (a, b) => statusRank(a.status) - statusRank(b.status) || a.amount.currency.localeCompare(b.amount.currency),
  );
}

function timeOf(iso: string): number {
  const time = Date.parse(iso);
  return Number.isNaN(time) ? 0 : time;
}

export function sortEntries(entries: CommissionEntry[]): CommissionEntry[] {
  return [...entries].sort((a, b) => timeOf(b.date) - timeOf(a.date));
}
