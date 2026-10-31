import { useTranslation } from "react-i18next";
import { RichText } from "../../i18n/RichText";
import { useLanguage } from "../../i18n/useLanguage";
import { LegalLayout } from "../Legal/LegalLayout";
import { ConsumerRequestForm } from "./ConsumerRequestForm";

export function Withdrawal() {
  const { t } = useTranslation("consumer");
  return (
    <LegalLayout title={t("titles.WITHDRAWAL")} language={useLanguage()}>
      <p>{t("withdrawal.intro")}</p>
      <p>{t("withdrawal.how")}</p>
      <p>
        <RichText text={t("withdrawal.other")} />
      </p>
      <ConsumerRequestForm kind="WITHDRAWAL" submitLabel={t("withdrawal.submit")} sentText={t("withdrawal.sent")} />
    </LegalLayout>
  );
}
