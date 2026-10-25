import type { ReferralCode } from "../api/types";

export const REFERRALS_KEY = "/referrals/me";

export function activeCodes(codes: ReferralCode[]): ReferralCode[] {
  return codes.filter((code) => code.status === "ACTIVE");
}
