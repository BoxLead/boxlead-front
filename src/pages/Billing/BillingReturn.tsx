import type { TFunction } from "i18next";
import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type { BillingSummary } from "../../api/types";
import { AlertIcon, CheckIcon, ClockIcon } from "../../components/icons/UiIcons";
import { BILLING_PATH } from "../../data/billing";
import { invalidateQueries } from "../../data/queryCache";
import { fetchSummary } from "../../data/subscription";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { checkoutOutcome, isSettled, RETURN_POLL_MS, RETURN_TIMEOUT_MS, type CheckoutOutcome } from "../../util/checkout";
import { cx } from "../../util/classNames";
import "./BillingReturn.css";

const MAX_ATTEMPTS = Math.floor(RETURN_TIMEOUT_MS / RETURN_POLL_MS) + 1;

type Poll = {
  summary: BillingSummary | null;
  outcome: CheckoutOutcome | null;
  failed: boolean;
  done: boolean;
};

const INITIAL: Poll = { summary: null, outcome: null, failed: false, done: false };

type View = {
  tone: "success" | "warning" | "danger" | "info";
  icon: ReactNode;
  title: string;
  text: string;
  busy?: boolean;
  actions: ReactNode;
};

function billingLink(label: string, primary = false) {
  return (
    <Link className={primary ? "btn btn-primary" : "btn btn-secondary"} to={BILLING_PATH}>
      {label}
    </Link>
  );
}

function viewFor(t: TFunction<"billing">, poll: Poll, retry: () => void): View {
  const { summary, outcome, failed, done } = poll;
  const viewBilling = billingLink(t("return.viewBilling"));
  const again = (
    <button type="button" className="btn btn-secondary" onClick={retry}>
      {t("return.checkAgain")}
    </button>
  );
  if (outcome === "approved") {
    return {
      tone: "success",
      icon: <CheckIcon />,
      title: t("return.approvedTitle"),
      text: summary?.plan?.name ? t("return.approvedPlan", { plan: summary.plan.name }) : t("return.approved"),
      actions: (
        <>
          <Link className="btn btn-primary" to="/app/inbox">
            {t("return.goInbox")}
          </Link>
          {viewBilling}
        </>
      ),
    };
  }
  if (outcome === "rejected") {
    const plan = summary?.checkout?.planCode;
    return {
      tone: "danger",
      icon: <AlertIcon />,
      title: t("return.rejectedTitle"),
      text: t("return.rejected"),
      actions: (
        <>
          <Link className="btn btn-primary" to={plan ? `${BILLING_PATH}?checkout=${plan}` : BILLING_PATH}>
            {t("return.retry")}
          </Link>
          {viewBilling}
        </>
      ),
    };
  }
  if (outcome === "pending") {
    return {
      tone: "warning",
      icon: <ClockIcon />,
      title: t("return.pendingTitle"),
      text: t("return.pending"),
      busy: !done,
      actions: billingLink(t("return.viewBilling"), true),
    };
  }
  if (outcome === "none") {
    return {
      tone: "info",
      icon: <AlertIcon />,
      title: t("return.noneTitle"),
      text: t("return.none"),
      actions: billingLink(t("return.goBilling"), true),
    };
  }
  if (outcome === "unpaid" && done) {
    return {
      tone: "warning",
      icon: <ClockIcon />,
      title: t("return.unpaidTitle"),
      text: t("return.unpaid"),
      actions: (
        <>
          {again}
          {viewBilling}
        </>
      ),
    };
  }
  if (outcome === "waiting" && done) {
    return {
      tone: "info",
      icon: <ClockIcon />,
      title: t("return.waitingTitle"),
      text: t("return.waiting"),
      actions: (
        <>
          {again}
          {viewBilling}
        </>
      ),
    };
  }
  if (failed && done) {
    return {
      tone: "danger",
      icon: <AlertIcon />,
      title: t("return.failedTitle"),
      text: t("return.failed"),
      actions: (
        <>
          {again}
          {viewBilling}
        </>
      ),
    };
  }
  return {
    tone: "info",
    icon: <ClockIcon />,
    title: t("return.checkingTitle"),
    text: t("return.checking"),
    busy: true,
    actions: null,
  };
}

export function BillingReturn() {
  const { t } = useTranslation("billing");
  useDocumentTitle(t("return.title"));

  const [poll, setPoll] = useState<Poll>(INITIAL);
  const [round, setRound] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function check(attempt: number) {
      let settled = false;
      try {
        const summary = await fetchSummary();
        if (cancelled) return;
        const outcome = checkoutOutcome(summary);
        settled = isSettled(outcome);
        if (outcome === "approved") void invalidateQueries("/billing/payments");
        setPoll({ summary, outcome, failed: false, done: settled });
      } catch {
        if (cancelled) return;
        setPoll((current) => ({ ...current, failed: true }));
      }
      if (settled) return;
      if (attempt + 1 >= MAX_ATTEMPTS) {
        setPoll((current) => ({ ...current, done: true }));
        return;
      }
      timer = setTimeout(() => void check(attempt + 1), RETURN_POLL_MS);
    }

    void check(0);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [round]);

  function retry() {
    setPoll(INITIAL);
    setRound((value) => value + 1);
  }

  const view = viewFor(t, poll, retry);

  return (
    <div className="page billing-return-page">
      <header className="page-header">
        <h1 className="page-title">{t("return.title")}</h1>
      </header>
      <section className={cx("panel billing-return", `billing-return-${view.tone}`)} aria-live="polite" aria-busy={view.busy || undefined}>
        <span className="billing-return-icon" aria-hidden="true">
          {view.busy ? <span className="spinner" /> : view.icon}
        </span>
        <h2 className="billing-return-title">{view.title}</h2>
        <p className="billing-return-text">{view.text}</p>
        {view.actions ? <div className="billing-return-actions">{view.actions}</div> : null}
      </section>
    </div>
  );
}
