import type { Money as MoneyValue } from "../api/types";
import { formatMoney } from "../format";
import "./Money.css";

type MoneyProps = {
  money: MoneyValue;
  code?: boolean;
  strong?: boolean;
};

export function Money({ money, code = false, strong = false }: MoneyProps) {
  return (
    <span className={strong ? "money money-strong" : "money"}>
      <span className="num">{formatMoney(money)}</span>
      {code ? <span className="money-code">{money.currency}</span> : null}
    </span>
  );
}
