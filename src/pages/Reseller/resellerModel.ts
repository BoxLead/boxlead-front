import type { SubscriptionStatus } from "../../api/types";
import type { TagTone } from "../../components/ui/Tag";

type StatusLabel = { label: string; tone: TagTone };

export const SUBSCRIPTION_LABELS: Record<SubscriptionStatus, StatusLabel> = {
  INCOMPLETE: { label: "Sin pago", tone: "neutral" },
  ACTIVE: { label: "Activo", tone: "success" },
  PAST_DUE: { label: "Pago atrasado", tone: "warning" },
  SUSPENDED: { label: "Suspendido", tone: "danger" },
  PAUSED: { label: "Pausado", tone: "neutral" },
  CANCELED: { label: "Dado de baja", tone: "neutral" },
};

export function subscriptionLabel(status: SubscriptionStatus): StatusLabel {
  return Object.hasOwn(SUBSCRIPTION_LABELS, status) ? SUBSCRIPTION_LABELS[status] : { label: status, tone: "neutral" };
}

export function cycleLabel(cycle: number, maxCycles: number): string {
  if (cycle <= 0) return "Sin cobros todavía";
  return `Cobro ${cycle} de ${maxCycles}`;
}

export function cycleProgress(cycle: number, maxCycles: number): boolean[] {
  const total = Math.max(0, Math.min(maxCycles, 12));
  return Array.from({ length: total }, (_, index) => index < cycle);
}
