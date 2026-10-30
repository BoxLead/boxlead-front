import { counterTone } from "./charCount";
import "./CharCounter.css";
import { intlLocale } from "../../i18n/locale";

type CharCounterProps = {
  length: number;
  max: number;
  id?: string;
  overLimitLabel: string;
};

export function CharCounter({ length, max, id, overLimitLabel }: CharCounterProps) {
  const tone = counterTone(length, max);
  return (
    <span id={id} className={`char-counter char-counter-${tone}`} aria-live={tone === "ok" ? "off" : "polite"}>
      {length.toLocaleString(intlLocale())} / {max.toLocaleString(intlLocale())}
      {tone === "over" ? <span className="visually-hidden">{` ${overLimitLabel}`}</span> : null}
    </span>
  );
}
