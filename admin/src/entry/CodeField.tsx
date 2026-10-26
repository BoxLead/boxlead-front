import { CODE_LENGTH } from "./code";
import "./CodeField.css";

type CodeFieldProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  autoFocus?: boolean;
};

export function CodeField({ value, onChange, disabled, invalid, describedBy, autoFocus }: CodeFieldProps) {
  return (
    <label className="auth-label">
      Código de 6 números
      <input
        className="auth-input code-field"
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="\d{6}"
        maxLength={CODE_LENGTH}
        required
        disabled={disabled}
        autoFocus={autoFocus}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH))}
      />
    </label>
  );
}
