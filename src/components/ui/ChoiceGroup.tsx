import { useLayoutEffect, useRef, type ReactNode } from "react";
import "./ChoiceGroup.css";

export type Choice<T extends string> = {
  value: T;
  label: string;
  icon?: ReactNode;
  count?: number;
  disabled?: boolean;
};

type ChoiceGroupProps<T extends string> = {
  label: string;
  choices: Choice<T>[];
  value: T;
  onChange: (value: T) => void;
  variant?: "segmented" | "chips";
  className?: string;
  unreadLabel?: (count: number) => string;
};

export function ChoiceGroup<T extends string>({
  label,
  choices,
  value,
  onChange,
  variant = "chips",
  className,
  unreadLabel,
}: ChoiceGroupProps<T>) {
  const ref = useRef<HTMLDivElement>(null);
  const segmented = variant === "segmented";

  useLayoutEffect(() => {
    const group = ref.current;
    if (!segmented || !group) return;
    const place = () => {
      const selected = group.querySelector<HTMLElement>(".choice-selected");
      if (!selected) {
        group.style.removeProperty("--indicator-w");
        return;
      }
      group.style.setProperty("--indicator-x", `${selected.offsetLeft}px`);
      group.style.setProperty("--indicator-w", `${selected.offsetWidth}px`);
    };
    place();
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(place) : null;
    observer?.observe(group);
    return () => observer?.disconnect();
  }, [segmented, value, choices]);

  return (
    <div
      ref={ref}
      role="group"
      aria-label={label}
      className={`choice-group choice-group-${variant}${className ? ` ${className}` : ""}`}
    >
      {segmented ? <span className="choice-indicator" aria-hidden="true" /> : null}
      {choices.map((choice) => {
        const selected = choice.value === value;
        return (
          <button
            key={choice.value}
            type="button"
            className={`choice${selected ? " choice-selected" : ""}`}
            aria-pressed={selected}
            disabled={choice.disabled}
            onClick={() => onChange(choice.value)}
          >
            {choice.icon ? <span className="choice-icon">{choice.icon}</span> : null}
            <span>{choice.label}</span>
            {choice.count ? (
              <span className="choice-count">
                <span aria-hidden="true">{choice.count > 99 ? "99+" : choice.count}</span>
                {unreadLabel ? <span className="visually-hidden">{unreadLabel(choice.count)}</span> : null}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
