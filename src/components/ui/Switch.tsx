import "./Switch.css";

type SwitchProps = {
  label: string;
  checked: boolean;
  disabled?: boolean;
  hideLabel?: boolean;
  onChange: (checked: boolean) => void;
};

export function Switch({ label, checked, disabled = false, hideLabel = false, onChange }: SwitchProps) {
  return (
    <label className={`switch${disabled ? " switch-disabled" : ""}`}>
      <input
        type="checkbox"
        role="switch"
        className="switch-input"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="switch-track" aria-hidden="true" />
      <span className={hideLabel ? "visually-hidden" : "switch-label"}>{label}</span>
    </label>
  );
}
