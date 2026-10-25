import type { CheckoutSummary } from "../../api/types";
import { Banner } from "../../components/ui/Banner";

type CheckoutNoticeProps = {
  checkout: CheckoutSummary;
  planName: string;
  onResume: () => void;
};

export function CheckoutNotice({ checkout, planName, onResume }: CheckoutNoticeProps) {
  if (checkout.status === "PENDING") {
    return (
      <Banner tone="warning" className="billing-notice" title={`Tu pago de ${planName} está pendiente`}>
        Mercado Pago lo está revisando. Cuando se confirme, tu plan se activa solo.
      </Banner>
    );
  }
  const rejected = checkout.status === "REJECTED";
  return (
    <Banner
      tone={rejected ? "danger" : "info"}
      className="billing-notice"
      title={rejected ? `Mercado Pago rechazó el pago de ${planName}` : `Tenés un pago de ${planName} sin terminar`}
      action={
        <button type="button" className="btn btn-secondary btn-sm" onClick={onResume}>
          {rejected ? "Probar de nuevo" : "Retomar el pago"}
        </button>
      }
    >
      {rejected
        ? "Revisá que pagues con la cuenta de Mercado Pago del email que indicaste, o probá con otro medio de pago."
        : "Si ya pagaste, Mercado Pago puede tardar unos minutos en confirmarlo."}
    </Banner>
  );
}
