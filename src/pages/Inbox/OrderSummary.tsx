import { useTranslation } from "react-i18next";
import type { ContextItem } from "../../api/types";
import { PackageIcon } from "../../components/icons/UiIcons";
import { Tag } from "../../components/ui/Tag";
import type { ContextStatus } from "../../platforms/types";
import { formatDate, formatMoney } from "../../util/format";

type OrderSummaryProps = {
  order: ContextItem;
  status: ContextStatus | null;
};

export function OrderSummary({ order, status }: OrderSummaryProps) {
  const { t } = useTranslation("inbox");
  return (
    <article className="order" aria-label={t("order.label", { id: order.externalId })}>
      <header className="order-head">
        <PackageIcon width={18} height={18} />
        <span className="order-title">{t("order.title", { id: order.externalId })}</span>
        {status ? <Tag tone={status.tone}>{status.label}</Tag> : null}
        {order.createdAt ? <span className="order-date">{formatDate(order.createdAt)}</span> : null}
      </header>
      {order.lines.length > 0 ? (
        <ul className="order-lines">
          {order.lines.map((line, index) => (
            <li key={line.externalItemId ?? index}>
              <span className="order-line-qty">{line.quantity ?? 1} ×</span>
              <span className="order-line-title">{line.title ?? line.externalItemId ?? t("order.product")}</span>
              {line.unitPrice !== null ? (
                <span className="order-line-price">{formatMoney(line.unitPrice, line.currency)}</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {order.price !== null ? (
        <p className="order-total">
          {t("order.total")} <strong>{formatMoney(order.price, order.currency)}</strong>
        </p>
      ) : null}
    </article>
  );
}
