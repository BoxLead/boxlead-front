import { useState } from "react";

type PasswordFieldProps = {
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  minLength?: number;
  hint?: string;
};

export function PasswordField({
  value,
  onChange,
  autoComplete,
  minLength,
  hint,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="auth-label">
      Contraseña
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
          {visible ? "Ocultar" : "Mostrar"}
        </button>
      </span>
      {hint ? <span className="auth-hint">{hint}</span> : null}
    </label>
  );
}
