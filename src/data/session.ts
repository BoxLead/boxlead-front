import { ApiError, onPlanError } from "../api/client";
import { BILLING_SUMMARY_KEY } from "./billing";
import { discardQueryData, onQueryError } from "./queryCache";

const listeners = new Set<() => void>();

export function requestSessionRefresh() {
  listeners.forEach((listener) => listener());
}

export function onSessionRefresh(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

onPlanError(() => requestSessionRefresh());

onQueryError((key, error) => {
  if (key !== BILLING_SUMMARY_KEY || !(error instanceof ApiError) || error.status !== 404) return;
  discardQueryData(key);
  requestSessionRefresh();
});
