import { useTranslation } from "react-i18next";
import type { ReferralCode } from "../../api/types";
import { Banner } from "../../components/ui/Banner";
import { useToast } from "../../components/ui/toast";

type ReferralLinksProps = {
  codes: ReferralCode[];
};

export function ReferralLinks({ codes }: ReferralLinksProps) {
  const { t } = useTranslation("billing");
  const toast = useToast();

  async function copy(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      toast({ message: t("reseller.copied") });
    } catch {
      toast({ tone: "danger", message: t("reseller.copyFailed") });
    }
  }

  if (codes.length === 0) {
    return (
      <Banner tone="info" title={t("reseller.noLink")}>
        {t("reseller.noLinkText")}
      </Banner>
    );
  }

  return (
    <section className="panel reseller-links" aria-labelledby="reseller-links-title">
      <h2 id="reseller-links-title" className="panel-title">
        {t("reseller.link", { count: codes.length })}
      </h2>
      <ul className="reseller-link-list">
        {codes.map((code) => (
          <li key={code.code} className="reseller-link">
            <code className="reseller-link-url">{code.link}</code>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => void copy(code.link)}>
              {t("reseller.copy")}
            </button>
          </li>
        ))}
      </ul>
      <p className="reseller-hint">{t("reseller.linkHint")}</p>
    </section>
  );
}
