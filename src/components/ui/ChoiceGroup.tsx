import type { ReactNode } from "react";
import "./ChoiceGroup.css";

export type Choice<T extends string> = {
  value: T;
  label: string;
  icon?: ReactNode;
  count?: number;
};

type ChoiceGroupProps<T extends string> = {
  label: string;
  choices: Choice<T>[];
  value: T;
  onChange: (value: T) => void;
  variant?: "segmented" | "chips";
  className?: string;
};

export function ChoiceGroup<T extends string>({
  label,
  choices,
  value,
  onChange,
  variant = "chips",
  className,
}: ChoiceGroupProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={`choice-group choice-group-${variant}${className ? ` ${className}` : ""}`}
    >
      {choices.map((choice) => {
        const selected = choice.value === value;
        return (
          <button
            key={choice.value}
            type="button"
            className={`choice${selected ? " choice-selected" : ""}`}
            aria-pressed={selected}
            onClick={() => onChange(choice.value)}
          >
            {choice.icon ? <span className="choice-icon">{choice.icon}</span> : null}
            <span>{choice.label}</span>
            {choice.count ? (
              <span className="choice-count" aria-label={`${choice.count} sin leer`}>
                {choice.count > 99 ? "99+" : choice.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
