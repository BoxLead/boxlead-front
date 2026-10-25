import type { ReferralCode } from "../../api/types";
import { Banner } from "../../components/ui/Banner";
import { useToast } from "../../components/ui/toast";

type ReferralLinksProps = {
  codes: ReferralCode[];
};

export function ReferralLinks({ codes }: ReferralLinksProps) {
  const toast = useToast();

  async function copy(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      toast({ message: "Copiaste tu link." });
    } catch {
      toast({ tone: "danger", message: "No pudimos copiar el link. Seleccionalo y copialo a mano." });
    }
  }

  if (codes.length === 0) {
    return (
      <Banner tone="info" title="No tenés un link activo">
        Hablá con BoxLead para que te activen uno.
      </Banner>
    );
  }

  return (
    <section className="panel reseller-links" aria-labelledby="reseller-links-title">
      <h2 id="reseller-links-title" className="panel-title">
        {codes.length === 1 ? "Tu link" : "Tus links"}
      </h2>
      <ul className="reseller-link-list">
        {codes.map((code) => (
          <li key={code.code} className="reseller-link">
            <code className="reseller-link-url">{code.link}</code>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => void copy(code.link)}>
              Copiar link
            </button>
          </li>
        ))}
      </ul>
      <p className="reseller-hint">Quien entra por tu link y crea su cuenta queda asociado a vos.</p>
    </section>
  );
}
