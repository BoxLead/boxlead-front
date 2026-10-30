import { useTranslation } from "react-i18next";
import type { CheckoutSummary } from "../../api/types";
import { Banner } from "../../components/ui/Banner";

type CheckoutNoticeProps = {
  checkout: CheckoutSummary;
  planName: string;
  onResume: () => void;
};

export function CheckoutNotice({ checkout, planName, onResume }: CheckoutNoticeProps) {
  const { t } = useTranslation("billing");
  if (checkout.status === "PENDING") {
    return (
      <Banner tone="warning" className="billing-notice" title={t("notice.pendingTitle", { plan: planName })}>
        {t("notice.pendingText")}
      </Banner>
    );
  }
  const rejected = checkout.status === "REJECTED";
  return (
    <Banner
      tone={rejected ? "danger" : "info"}
      className="billing-notice"
      title={rejected ? t("notice.rejectedTitle", { plan: planName }) : t("notice.unfinishedTitle", { plan: planName })}
      action={
        <button type="button" className="btn btn-secondary btn-sm" onClick={onResume}>
          {rejected ? t("notice.retry") : t("notice.resume")}
        </button>
      }
    >
      {rejected ? t("notice.rejectedText") : t("notice.unfinishedText")}
    </Banner>
  );
}
