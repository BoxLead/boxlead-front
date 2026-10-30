import { useTranslation } from "react-i18next";
import type { ReferredCustomer } from "../../api/types";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { UsersIcon } from "../../components/icons/UiIcons";
import { Tag } from "../../components/ui/Tag";
import { cx } from "../../util/classNames";
import { cycleLabel, cycleProgress, subscriptionLabel } from "./resellerModel";

type ReferredCustomersProps = {
  customers: ReferredCustomer[];
};

export function ReferredCustomers({ customers }: ReferredCustomersProps) {
  const { t } = useTranslation("billing");
  return (
    <section className="reseller-section" aria-labelledby="reseller-customers-title">
      <div className="reseller-section-head">
        <h2 id="reseller-customers-title" className="reseller-section-title">{t("reseller.customers")}</h2>
        <p className="reseller-hint">{t("reseller.customersHint")}</p>
      </div>
      {customers.length === 0 ? (
        <div className="panel">
          <EmptyState
            icon={<UsersIcon />}
            title={t("reseller.noCustomers")}
            hint={t("reseller.noCustomersHint")}
          />
        </div>
      ) : (
        <ul className="panel reseller-customers" aria-label={t("reseller.customers")}>
          {customers.map((customer, index) => {
            const status = subscriptionLabel(customer.subscriptionStatus);
            return (
              <li key={`${customer.label}-${index}`} className="reseller-customer">
                <div className="reseller-customer-head">
                  <span className="reseller-customer-name">{customer.label}</span>
                  <Tag tone={status.tone}>{status.label}</Tag>
                </div>
                <div className="reseller-cycle">
                  <span className="reseller-cycle-steps" aria-hidden="true">
                    {cycleProgress(customer.cycle, customer.maxCycles).map((done, step) => (
                      <span key={step} className={cx("reseller-cycle-step", done && "is-done")} />
                    ))}
                  </span>
                  <span className="reseller-cycle-label">{cycleLabel(customer.cycle, customer.maxCycles)}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
