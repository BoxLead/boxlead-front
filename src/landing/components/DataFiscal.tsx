import { useTranslation } from "react-i18next";
import { dataFiscalBadge } from "../../components/ProviderDetails/provider";

export function DataFiscal() {
  const { t } = useTranslation("landing");
  const badge = dataFiscalBadge();
  if (!badge) return null;
  return (
    <a href={badge.url} target="_F960AFIPInfo" rel="noopener noreferrer" className="footer-data-fiscal">
      <img src={badge.image} alt={t("footer.dataFiscal")} loading="lazy" />
    </a>
  );
}
