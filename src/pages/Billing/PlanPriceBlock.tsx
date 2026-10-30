import { useTranslation } from "react-i18next";
import type { PlanPrice } from "../../util/planPrice";
import { nationalTaxesLegend } from "../../util/planPrice";
import { rateNote } from "./billingLabels";

type PlanPriceBlockProps = {
  price: PlanPrice;
  includesVat: boolean;
};

export function PlanPriceBlock({ price, includesVat }: PlanPriceBlockProps) {
  const { t } = useTranslation("billing");
  const note = rateNote(price.rateDay);
  return (
    <div className="plan-price">
      <p className="plan-price-charge">
        <strong>{price.amount}</strong> <span>{price.period}</span>
      </p>
      {includesVat ? <p className="plan-price-note">{t("price.finalWithVat")}</p> : null}
      {note ? <p className="plan-price-note">{note}</p> : null}
      {price.withoutNationalTaxes ? (
        <p className="plan-price-net">
          {nationalTaxesLegend()} {price.withoutNationalTaxes}
        </p>
      ) : null}
      {price.reference ? (
        <p className="plan-price-reference">{t("price.reference", { price: price.reference })}</p>
      ) : null}
    </div>
  );
}
