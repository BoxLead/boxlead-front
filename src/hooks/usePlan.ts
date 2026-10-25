import { useContext } from "react";
import type { Access, BillingSummary, PlanLimits } from "../api/types";
import { AuthContext, SESSION_FLAGS_OFF } from "../context/auth";
import { BILLING_SUMMARY_KEY } from "../data/billing";
import { useApiQuery } from "./useApiQuery";

export type PlanState = {
  billing: boolean;
  summary: BillingSummary | undefined;
  loading: boolean;
  access: Access;
  restricted: boolean;
  limits: PlanLimits;
};

export function usePlan(): PlanState {
  const { features, access: sessionAccess } = useContext(AuthContext) ?? SESSION_FLAGS_OFF;
  const summary = useApiQuery<BillingSummary>(features.billing ? BILLING_SUMMARY_KEY : null);
  const access = summary.data?.access ?? sessionAccess;
  return {
    billing: features.billing,
    summary: summary.data,
    loading: summary.loading,
    access,
    restricted: features.billing && access === "RESTRICTED",
    limits: summary.data?.limits ?? {},
  };
}
