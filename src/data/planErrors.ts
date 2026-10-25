import { onPlanError, type PlanErrorCode } from "../api/client";
import { BILLING_SUMMARY_KEY } from "./billing";
import { invalidateQueries } from "./queryCache";

let current: PlanErrorCode | null = null;
const listeners = new Set<() => void>();

function emit(next: PlanErrorCode | null) {
  current = next;
  listeners.forEach((listener) => listener());
}

onPlanError((code) => {
  emit(code);
  void invalidateQueries(BILLING_SUMMARY_KEY);
});

export function lastPlanError(): PlanErrorCode | null {
  return current;
}

export function dismissPlanError() {
  if (current !== null) emit(null);
}

export function subscribePlanErrors(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
