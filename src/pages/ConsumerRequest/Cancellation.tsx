import { useTranslation } from "react-i18next";
import { RichText } from "../../i18n/RichText";
import { useLanguage } from "../../i18n/useLanguage";
import { LegalLayout } from "../Legal/LegalLayout";
import { ConsumerRequestForm } from "./ConsumerRequestForm";

export function Cancellation() {
  const { t } = useTranslation("consumer");
  return (
    <LegalLayout title={t("titles.CANCELLATION")} language={useLanguage()}>
      <p>{t("cancellation.intro")}</p>
      <p>{t("cancellation.how")}</p>
      <p>
        <RichText text={t("cancellation.other")} />
      </p>
      <ConsumerRequestForm kind="CANCELLATION" submitLabel={t("cancellation.submit")} sentText={t("cancellation.sent")} />
    </LegalLayout>
  );
}
