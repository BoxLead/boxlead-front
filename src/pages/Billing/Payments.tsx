import { useTranslation } from "react-i18next";
import type { BillingPayment } from "../../api/types";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { CardIcon } from "../../components/icons/UiIcons";
import { Banner } from "../../components/ui/Banner";
import { Tag } from "../../components/ui/Tag";
import { PAYMENTS_KEY } from "../../data/subscription";
import { useApiQuery } from "../../hooks/useApiQuery";
import { formatMinor } from "../../util/planPrice";
import { paymentStatus } from "./billingLabels";
import { longDate } from "./dates";

export function Payments() {
  const { t } = useTranslation("billing");
  const payments = useApiQuery<BillingPayment[]>(PAYMENTS_KEY);
  const list = payments.data ?? [];

  return (
    <section className="billing-section" aria-labelledby="billing-payments-title">
      <h2 id="billing-payments-title" className="billing-section-title">
        {t("payments.title")}
      </h2>
      {payments.error && !payments.data ? (
        <Banner
          tone="danger"
          title={t("payments.loadFailed")}
          action={
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => void payments.reload()}>
              {t("retry")}
            </button>
          }
        >
          {payments.error}
        </Banner>
      ) : payments.loading ? (
        <div className="panel billing-payments" aria-hidden="true">
          {[0, 1, 2].map((index) => (
            <div key={index} className="skeleton billing-row-skeleton" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="panel">
          <EmptyState icon={<CardIcon />} title={t("payments.empty")} hint={t("payments.emptyHint")} />
        </div>
      ) : (
        <ul className="panel billing-payments" aria-label={t("payments.title")}>
          {list.map((payment, index) => {
            const status = paymentStatus(payment.status);
            return (
              <li key={`${payment.date}-${index}`} className="billing-payment">
                <span className="billing-payment-date">{longDate(payment.date)}</span>
                <span className="billing-payment-amount">{formatMinor(payment.amount)}</span>
                <Tag tone={status.tone}>{status.label}</Tag>
                <span className="billing-payment-invoice">
                  {payment.invoiceNumber ? t("payments.invoice", { number: payment.invoiceNumber }) : t("payments.noInvoice")}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
