import { type FormEvent, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { AuthLayout } from "../../components/AuthLayout/AuthLayout";
import { PasswordField } from "../../components/AuthLayout/PasswordField";
import { useAuth } from "../../context/AuthContext";

export function Login() {
  const { token, login, isLoading, error, clearError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  if (token) {
    return <Navigate to="/app/inbox" replace />;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    clearError();
    try {
      await login({ email: email.trim(), password });
    } catch {
      /* error surfaced via context */
    }
  }

  return (
    <AuthLayout>
      <h1 className="auth-title">Iniciar sesión</h1>
      <p className="auth-subtitle">Ingresá a tu cuenta de BoxLead.</p>
      <form className="auth-form" onSubmit={handleSubmit}>
        {error ? (
          <div className="auth-error" role="alert">
            {error}
          </div>
        ) : null}
        <label className="auth-label">
          Email
          <input
            className="auth-input"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="vos@tuempresa.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <PasswordField
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
        />
        <button className="auth-submit" type="submit" disabled={isLoading}>
          {isLoading ? "Ingresando…" : "Ingresar"}
        </button>
      </form>
      <p className="auth-footer">
        ¿No tenés cuenta? <Link to="/register">Crear cuenta</Link>
      </p>
    </AuthLayout>
  );
}
