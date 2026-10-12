import { counterTone } from "./charCount";
import "./CharCounter.css";

type CharCounterProps = {
  length: number;
  max: number;
  id?: string;
};

export function CharCounter({ length, max, id }: CharCounterProps) {
  const tone = counterTone(length, max);
  return (
    <span id={id} className={`char-counter char-counter-${tone}`} aria-live={tone === "ok" ? "off" : "polite"}>
      {length.toLocaleString("es-AR")} / {max.toLocaleString("es-AR")}
      {tone === "over" ? <span className="visually-hidden"> caracteres, supera el máximo</span> : null}
    </span>
  );
}
