import { dataFiscalBadge } from "../../components/ProviderDetails/provider";

export function DataFiscal() {
  const badge = dataFiscalBadge();
  if (!badge) return null;
  return (
    <a href={badge.url} target="_F960AFIPInfo" rel="noopener noreferrer" className="footer-data-fiscal">
      <img src={badge.image} alt="Data Fiscal, formulario 960/D de ARCA" loading="lazy" />
    </a>
  );
}
