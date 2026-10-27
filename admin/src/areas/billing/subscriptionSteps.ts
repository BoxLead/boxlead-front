import { formatDate } from "../../format";
import type { SubscriptionAction } from "./api";
import { cancelCause } from "./labels";
import type { SubscriptionRow } from "./types";

export function nextStep(row: SubscriptionRow): string {
  switch (row.status) {
    case "CANCELED": {
      const cause = cancelCause(row.cancelReason);
      return `Cancelada el ${formatDate(row.canceledAt)}${cause ? `, ${cause}` : ""}`;
    }
    case "PAUSED":
      return "Sin cobros hasta que se reanude";
    case "INCOMPLETE":
      return "Espera el primer pago";
    case "SUSPENDED":
      if (row.disputed) return "En disputa en Mercado Pago";
      return row.suspendedUntil ? `Se cancela el ${formatDate(row.suspendedUntil)} si no paga` : "Suspendida hasta que pague";
    case "PAST_DUE":
      return row.graceUntil ? `En gracia hasta el ${formatDate(row.graceUntil)}` : "Cuota impaga";
    case "ACTIVE":
      if (row.cancelAtPeriodEnd) return `Termina el ${formatDate(row.paidThrough ?? row.currentPeriodEnd)}`;
      return `Renueva el ${formatDate(row.currentPeriodEnd)}`;
  }
}

export function actionsFor(row: SubscriptionRow): SubscriptionAction[] {
  switch (row.status) {
    case "ACTIVE":
    case "PAST_DUE":
    case "SUSPENDED":
      return ["pause", "cancel"];
    case "PAUSED":
      return ["resume", "cancel"];
    case "INCOMPLETE":
      return ["cancel"];
    case "CANCELED":
      return [];
  }
}
