import { ChevronLeftIcon, ChevronRightIcon } from "../../../src/components/icons/UiIcons";
import { formatMonth, shiftMonth } from "../format";
import "./MonthPicker.css";

type MonthPickerProps = {
  value: string;
  max: string;
  onChange: (month: string) => void;
};

export function MonthPicker({ value, max, onChange }: MonthPickerProps) {
  const label = formatMonth(value);
  const atMax = value >= max;
  return (
    <div className="month-picker" role="group" aria-label="Mes">
      <button
        type="button"
        className="btn btn-secondary btn-icon"
        aria-label={`Mes anterior, ${formatMonth(shiftMonth(value, -1))}`}
        onClick={() => onChange(shiftMonth(value, -1))}
      >
        <ChevronLeftIcon width={16} height={16} />
      </button>
      <span className="month-picker-label" aria-live="polite">
        {label}
      </span>
      <button
        type="button"
        className="btn btn-secondary btn-icon"
        aria-label={atMax ? "No hay un mes siguiente" : `Mes siguiente, ${formatMonth(shiftMonth(value, 1))}`}
        disabled={atMax}
        onClick={() => onChange(shiftMonth(value, 1))}
      >
        <ChevronRightIcon width={16} height={16} />
      </button>
    </div>
  );
}
