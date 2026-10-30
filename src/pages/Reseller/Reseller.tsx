import { useTranslation } from "react-i18next";
import type { ReferralsResponse } from "../../api/types";
import { Banner } from "../../components/ui/Banner";
import { REFERRALS_KEY, activeCodes } from "../../data/referrals";
import { useApiQuery } from "../../hooks/useApiQuery";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { Commissions } from "./Commissions";
import { ReferralLinks } from "./ReferralLinks";
import { ReferredCustomers } from "./ReferredCustomers";
import { ResellerStats } from "./ResellerStats";
import "./Reseller.css";

function ResellerSkeleton() {
  return (
    <div className="reseller-body" aria-hidden="true">
      <div className="skeleton reseller-skeleton-link" />
      <div className="reseller-stats">
        {[0, 1, 2].map((index) => (
          <div key={index} className="skeleton reseller-skeleton-stat" />
        ))}
      </div>
      <div className="skeleton reseller-skeleton-list" />
    </div>
  );
}

export function Reseller() {
  const { t } = useTranslation("billing");
  useDocumentTitle(t("reseller.title"));

  const referrals = useApiQuery<ReferralsResponse>(REFERRALS_KEY);
  const data = referrals.data;

  return (
    <div className="page reseller-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">{t("reseller.title")}</h1>
          <p className="page-header-desc">{t("reseller.description")}</p>
        </div>
      </header>

      {referrals.error && !data ? (
        <Banner
          tone="danger"
          title={t("reseller.loadFailed")}
          action={
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => void referrals.reload()}>
              {t("retry")}
            </button>
          }
        >
          {referrals.error}
        </Banner>
      ) : !data ? (
        <>
          <span className="visually-hidden" role="status">{t("reseller.loading")}</span>
          <ResellerSkeleton />
        </>
      ) : (
        <div className="reseller-body">
          <ReferralLinks codes={activeCodes(data.codes)} />
          <ResellerStats stats={data.stats} />
          <ReferredCustomers customers={data.customers} />
          <Commissions totals={data.totals} entries={data.entries} />
        </div>
      )}
    </div>
  );
}
