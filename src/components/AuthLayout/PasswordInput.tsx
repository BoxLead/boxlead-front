import { useState } from "react";

export type PasswordInputProps = {
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  label: string;
  showLabel: string;
  hideLabel: string;
  minLength?: number;
  hint?: string;
};

export function PasswordInput({ value, onChange, autoComplete, label, showLabel, hideLabel, minLength, hint }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="auth-label">
      {label}
      <span className="auth-password">
        <input
          className="auth-input"
          type={visible ? "text" : "password"}
          name="password"
          autoComplete={autoComplete}
          required
          minLength={minLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          className="auth-password-toggle"
          aria-pressed={visible}
          onClick={() => setVisible((shown) => !shown)}
        >
          {visible ? hideLabel : showLabel}
        </button>
      </span>
      {hint ? <span className="auth-hint">{hint}</span> : null}
    </label>
  );
}
