import { useId, type ReactNode } from "react";
import { cx } from "../../util/classNames";

type PlanOptionProps = {
  name: string;
  tag?: string;
  value: string;
  checked: boolean;
  disabled?: boolean;
  onSelect: () => void;
  children: ReactNode;
};

export function PlanOption({ name, tag, value, checked, disabled = false, onSelect, children }: PlanOptionProps) {
  const nameId = useId();
  const detailsId = useId();
  return (
    <label className={cx("plan-option", checked && "plan-option-selected", disabled && "plan-option-disabled")}>
      <input
        className="plan-option-radio"
        type="radio"
        name="plan"
        value={value}
        checked={checked}
        disabled={disabled}
        aria-labelledby={nameId}
        aria-describedby={detailsId}
        onChange={onSelect}
      />
      <span className="plan-option-head">
        <span className="plan-option-name" id={nameId}>
          {name}
        </span>
        {tag ? <span className="plan-option-tag">{tag}</span> : null}
      </span>
      <span className="plan-option-details" id={detailsId}>
        {children}
      </span>
    </label>
  );
}
