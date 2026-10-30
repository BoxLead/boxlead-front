import i18next from "i18next";
import type { PlanErrorCode } from "../../api/client";
import type { BillingSummary } from "../../api/types";
import { BILLING_PATH, isTeamPlan } from "../../data/billing";
import { formatNumber } from "../../util/format";
import type { BannerTone } from "../ui/Banner";
import { intlLocale } from "../../i18n/locale";

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

type ActionKey = "choosePlan" | "seePlans" | "goToBilling" | "updatePayment";

function actionLabel(key: ActionKey): string {
  return i18next.t(`plan.actions.${key}`, { ns: "shell" });
}

function billingAction(key: ActionKey): NoticeAction {
  return {
    get label() {
      return actionLabel(key);
    },
    href: BILLING_PATH,
    external: false,
  };
}

export const CHOOSE_PLAN = billingAction("choosePlan");
export const SEE_PLANS = billingAction("seePlans");
const GO_TO_BILLING = billingAction("goToBilling");

export function longDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(intlLocale(), { day: "numeric", month: "long" });
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
  return safe ? { label: actionLabel("updatePayment"), href: safe, external: true } : GO_TO_BILLING;
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
  const limit = formatNumber(summary.limits.AGENT_REPLIES_PER_PERIOD ?? 0);
  const date = longDate(summary.usage.periodEnd);
  if (team) {
    return {
      kind: "replies-limit",
      tone: "warning",
      title: i18next.t("plan.repliesLimit.teamTitle", { ns: "shell" }),
      text: date
        ? i18next.t("plan.repliesLimit.teamUntil", { ns: "shell", limit, date })
        : i18next.t("plan.repliesLimit.teamNextPeriod", { ns: "shell", limit }),
      action: GO_TO_BILLING,
    };
  }
  return {
    kind: "replies-limit",
    tone: "warning",
    title: i18next.t("plan.repliesLimit.title", { ns: "shell" }),
    text: date
      ? i18next.t("plan.repliesLimit.until", { ns: "shell", limit, date })
      : i18next.t("plan.repliesLimit.changePlan", { ns: "shell", limit }),
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
      title: i18next.t("plan.suspended.title", { ns: "shell" }),
      text: restricted
        ? i18next.t("plan.suspended.restricted", { ns: "shell" })
        : i18next.t("plan.suspended.open", { ns: "shell" }),
      action: updatePayment(subscription.updatePaymentUrl),
    };
  }
  if (subscription?.status === "PAUSED") {
    return {
      kind: "paused",
      tone: "danger",
      title: i18next.t("plan.paused.title", { ns: "shell" }),
      text: restricted ? i18next.t("plan.paused.restricted", { ns: "shell" }) : i18next.t("plan.paused.open", { ns: "shell" }),
      action: GO_TO_BILLING,
    };
  }
  if (restricted) {
    return {
      kind: "no-plan",
      tone: "warning",
      title: i18next.t("plan.noPlan.title", { ns: "shell" }),
      text: i18next.t("plan.noPlan.text", { ns: "shell" }),
      action: CHOOSE_PLAN,
    };
  }
  if (subscription?.status === "PAST_DUE") {
    const date = subscription.graceUntil ? longDate(subscription.graceUntil) : "";
    return {
      kind: "past-due",
      tone: "warning",
      title: i18next.t("plan.pastDue.title", { ns: "shell" }),
      text: date ? i18next.t("plan.pastDue.until", { ns: "shell", date }) : i18next.t("plan.pastDue.text", { ns: "shell" }),
      action: updatePayment(subscription.updatePaymentUrl),
    };
  }
  if (repliesLimitReached(summary)) return repliesLimitNotice(summary, false);
  if (summary.demo && demoEnding(summary, now)) {
    return {
      kind: "demo-ending",
      tone: "info",
      title: i18next.t("plan.demoEnding.title", { ns: "shell" }),
      text: i18next.t("plan.demoEnding.text", { ns: "shell", date: longDate(summary.demo.endsAt) }),
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
      title: i18next.t("plan.required.title", { ns: "shell" }),
      text: i18next.t("plan.required.text", { ns: "shell" }),
      action: CHOOSE_PLAN,
    };
  }
  return {
    title: i18next.t("plan.limitReached.title", { ns: "shell" }),
    text: i18next.t("plan.limitReached.text", { ns: "shell" }),
    action: SEE_PLANS,
  };
}
