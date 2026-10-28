import type { PlanErrorCode } from "../../api/client";
import type { BillingSummary } from "../../api/types";
import { BILLING_PATH, isTeamPlan } from "../../data/billing";
import { formatNumber } from "../../util/format";
import type { BannerTone } from "../ui/Banner";

export type PlanNoticeKind = "suspended" | "paused" | "no-plan" | "past-due" | "replies-limit" | "demo-ending";

export type NoticeAction = {
  label: string;
  href: string;
  external: boolean;
};

export type PlanNotice = {
  kind: PlanNoticeKind;
  tone: BannerTone;
  title: string;
  text: string;
  action: NoticeAction;
};

export const DEMO_WARNING_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;
const PAYMENT_HOST = "www.mercadopago.com.ar";

export const CHOOSE_PLAN: NoticeAction = { label: "Elegir un plan", href: BILLING_PATH, external: false };
export const SEE_PLANS: NoticeAction = { label: "Ver planes", href: BILLING_PATH, external: false };
const GO_TO_BILLING: NoticeAction = { label: "Ir a facturación", href: BILLING_PATH, external: false };

export function longDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("es-AR", { day: "numeric", month: "long" });
}

export function safePaymentUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname === PAYMENT_HOST ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function updatePayment(url: string | null | undefined): NoticeAction {
  const safe = safePaymentUrl(url);
  return safe ? { label: "Cambiar medio de pago", href: safe, external: true } : GO_TO_BILLING;
}

function repliesLimitReached(summary: BillingSummary): boolean {
  const limit = summary.limits.AGENT_REPLIES_PER_PERIOD;
  return typeof limit === "number" && summary.usage.agentReplies.used >= limit;
}

function demoEnding(summary: BillingSummary, now: Date): boolean {
  if (summary.plan?.source !== "DEMO" || !summary.demo) return false;
  const left = Date.parse(summary.demo.endsAt) - now.getTime();
  return left > 0 && left <= DEMO_WARNING_DAYS * DAY_MS;
}

function repliesLimitNotice(summary: BillingSummary, team: boolean): PlanNotice {
  const limit = summary.limits.AGENT_REPLIES_PER_PERIOD ?? 0;
  const until = longDate(summary.usage.periodEnd);
  const used = `Usaron ${formatNumber(limit)} de ${formatNumber(limit)}.`;
  if (team) {
    return {
      kind: "replies-limit",
      tone: "warning",
      title: "Tus agentes usaron todas las respuestas del período",
      text: until ? `${used} Vuelven a responder el ${until}.` : `${used} Vuelven a responder cuando empiece el próximo período.`,
      action: GO_TO_BILLING,
    };
  }
  return {
    kind: "replies-limit",
    tone: "warning",
    title: "Tus agentes usaron todas las respuestas del plan",
    text: until
      ? `${used} Vuelven a responder el ${until} o antes si cambiás de plan.`
      : `${used} Cambiá de plan para que sigan respondiendo.`,
    action: SEE_PLANS,
  };
}

export function planNotice(summary: BillingSummary, now: Date = new Date()): PlanNotice | null {
  if (isTeamPlan(summary)) return repliesLimitReached(summary) ? repliesLimitNotice(summary, true) : null;
  const subscription = summary.subscription;
  const restricted = summary.access === "RESTRICTED";
  if (subscription?.status === "SUSPENDED") {
    return {
      kind: "suspended",
      tone: "danger",
      title: "Tu plan está suspendido",
      text: restricted
        ? "No pudimos cobrarlo. Tus agentes no responden y no podés enviar mensajes hasta que actualices el medio de pago."
        : "No pudimos cobrarlo. Actualizá el medio de pago para regularizarlo.",
      action: updatePayment(subscription.updatePaymentUrl),
    };
  }
  if (subscription?.status === "PAUSED") {
    return {
      kind: "paused",
      tone: "danger",
      title: "Tu plan está en pausa",
      text: restricted
        ? "Tus agentes no responden y no podés enviar mensajes hasta que lo reactives."
        : "Reactivalo para seguir con tu plan.",
      action: GO_TO_BILLING,
    };
  }
  if (restricted) {
    return {
      kind: "no-plan",
      tone: "warning",
      title: "No tenés un plan activo",
      text: "Podés ver tus conversaciones, leads y métricas, pero tus agentes no responden y no podés enviar mensajes.",
      action: CHOOSE_PLAN,
    };
  }
  if (subscription?.status === "PAST_DUE") {
    const until = subscription.graceUntil ? longDate(subscription.graceUntil) : "";
    return {
      kind: "past-due",
      tone: "warning",
      title: "No pudimos cobrar tu plan",
      text: until
        ? `Actualizá el medio de pago antes del ${until} para no perder el acceso.`
        : "Actualizá el medio de pago para no perder el acceso.",
      action: updatePayment(subscription.updatePaymentUrl),
    };
  }
  if (repliesLimitReached(summary)) return repliesLimitNotice(summary, false);
  if (summary.demo && demoEnding(summary, now)) {
    return {
      kind: "demo-ending",
      tone: "info",
      title: "Tu Beta termina pronto",
      text: `Termina el ${longDate(summary.demo.endsAt)}. Elegí un plan para que tus agentes sigan respondiendo.`,
      action: CHOOSE_PLAN,
    };
  }
  return null;
}

const RESTRICTED_KINDS: PlanNoticeKind[] = ["suspended", "paused", "no-plan"];

export type PlanErrorNotice = {
  title: string;
  text: string;
  action: NoticeAction;
};

export function planErrorNotice(code: PlanErrorCode, notice: PlanNotice | null): PlanErrorNotice | null {
  if (code === "PLAN_REQUIRED") {
    if (notice && RESTRICTED_KINDS.includes(notice.kind)) return null;
    return {
      title: "Necesitás un plan activo",
      text: "Sin un plan tus agentes no responden y no podés enviar mensajes.",
      action: CHOOSE_PLAN,
    };
  }
  return {
    title: "Llegaste al límite de tu plan",
    text: "Para seguir, pasate a un plan con más capacidad.",
    action: SEE_PLANS,
  };
}
