import { useEffect, useState, type ReactNode } from "react";
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

function billingLink(primary = false, label = "Ver facturación") {
  return (
    <Link className={primary ? "btn btn-primary" : "btn btn-secondary"} to={BILLING_PATH}>
      {label}
    </Link>
  );
}

function viewFor(poll: Poll, retry: () => void): View {
  const { summary, outcome, failed, done } = poll;
  const again = (
    <button type="button" className="btn btn-secondary" onClick={retry}>
      Volver a consultar
    </button>
  );
  if (outcome === "approved") {
    return {
      tone: "success",
      icon: <CheckIcon />,
      title: "Tu pago está confirmado",
      text: summary?.plan?.name ? `Ya tenés ${summary.plan.name}. Tus agentes pueden responder.` : "Tu plan ya está activo.",
      actions: (
        <>
          <Link className="btn btn-primary" to="/app/inbox">
            Ir a la bandeja
          </Link>
          {billingLink()}
        </>
      ),
    };
  }
  if (outcome === "rejected") {
    const plan = summary?.checkout?.planCode;
    return {
      tone: "danger",
      icon: <AlertIcon />,
      title: "Mercado Pago rechazó el pago",
      text: "Revisá que pagues con la cuenta de Mercado Pago del email que indicaste, o probá con otro medio de pago.",
      actions: (
        <>
          <Link className="btn btn-primary" to={plan ? `${BILLING_PATH}?checkout=${plan}` : BILLING_PATH}>
            Probar de nuevo
          </Link>
          {billingLink()}
        </>
      ),
    };
  }
  if (outcome === "pending") {
    return {
      tone: "warning",
      icon: <ClockIcon />,
      title: "Tu pago está pendiente",
      text: "Mercado Pago lo está revisando. Cuando se confirme, tu plan se activa solo y lo vas a ver en Facturación.",
      busy: !done,
      actions: billingLink(true),
    };
  }
  if (outcome === "none") {
    return {
      tone: "info",
      icon: <AlertIcon />,
      title: "No encontramos un pago en curso",
      text: "Si querés contratar un plan, elegilo en Facturación.",
      actions: billingLink(true, "Ir a Facturación"),
    };
  }
  if (outcome === "unpaid" && done) {
    return {
      tone: "warning",
      icon: <ClockIcon />,
      title: "Todavía no vemos el pago de la cuota",
      text: "Si cambiaste el medio de pago, Mercado Pago vuelve a intentar el cobro. Cuando se apruebe lo vas a ver en Facturación.",
      actions: (
        <>
          {again}
          {billingLink()}
        </>
      ),
    };
  }
  if (outcome === "waiting" && done) {
    return {
      tone: "info",
      icon: <ClockIcon />,
      title: "Todavía no tenemos la confirmación",
      text: "Si ya pagaste, Mercado Pago puede tardar unos minutos en avisarnos. El estado también se ve en Facturación.",
      actions: (
        <>
          {again}
          {billingLink()}
        </>
      ),
    };
  }
  if (failed && done) {
    return {
      tone: "danger",
      icon: <AlertIcon />,
      title: "No pudimos consultar tu pago",
      text: "Revisá tu conexión y volvé a consultar. Si pagaste, el pago no se pierde.",
      actions: (
        <>
          {again}
          {billingLink()}
        </>
      ),
    };
  }
  return {
    tone: "info",
    icon: <ClockIcon />,
    title: "Estamos confirmando tu pago",
    text: "Le preguntamos a Mercado Pago cómo salió. Esto puede tardar unos segundos.",
    busy: true,
    actions: null,
  };
}

export function BillingReturn() {
  useDocumentTitle("Estado del pago");

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

  const view = viewFor(poll, retry);

  return (
    <div className="page billing-return-page">
      <header className="page-header">
        <h1 className="page-title">Estado del pago</h1>
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
