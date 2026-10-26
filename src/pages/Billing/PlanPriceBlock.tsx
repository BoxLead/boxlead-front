import type { PlanPrice } from "../../util/planPrice";
import { NATIONAL_TAXES_LEGEND } from "../../util/planPrice";
import { rateNote } from "./billingLabels";

type PlanPriceBlockProps = {
  price: PlanPrice;
  includesVat: boolean;
};

export function PlanPriceBlock({ price, includesVat }: PlanPriceBlockProps) {
  const note = rateNote(price.rateDay);
  return (
    <div className="plan-price">
      <p className="plan-price-charge">
        <strong>{price.amount}</strong> <span>{price.period}</span>
      </p>
      {includesVat ? <p className="plan-price-note">Precio final con IVA</p> : null}
      {note ? <p className="plan-price-note">{note}</p> : null}
      {price.withoutNationalTaxes ? (
        <p className="plan-price-net">
          {NATIONAL_TAXES_LEGEND} {price.withoutNationalTaxes}
        </p>
      ) : null}
      {price.reference ? (
        <p className="plan-price-reference">Referencia {price.reference}</p>
      ) : null}
    </div>
  );
}
