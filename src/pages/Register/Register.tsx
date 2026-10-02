import { type FormEvent, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { AuthLayout } from "../../components/AuthLayout/AuthLayout";
import { PasswordField } from "../../components/AuthLayout/PasswordField";
import { useAuth } from "../../context/AuthContext";

const MIN_PASSWORD_LENGTH = 6;

export function Register() {
  const { token, register, isLoading, error, clearError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  if (token) {
    return <Navigate to="/app/inbox" replace />;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    clearError();
    try {
      await register({
        email: email.trim(),
        password,
        name: name.trim() || undefined,
      });
    } catch {
      /* error surfaced via context */
    }
  }

  return (
    <AuthLayout>
      <h1 className="auth-title">Crear cuenta</h1>
      <p className="auth-subtitle">Empezá a usar BoxLead en minutos.</p>
      <form className="auth-form" onSubmit={handleSubmit}>
        {error ? (
          <div className="auth-error" role="alert">
            {error}
          </div>
        ) : null}
        <label className="auth-label">
          <span>
            Nombre <span className="auth-optional">(opcional)</span>
          </span>
          <input
            className="auth-input"
            type="text"
            name="name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
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
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          hint={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres.`}
          value={password}
          onChange={setPassword}
        />
        <button className="auth-submit" type="submit" disabled={isLoading}>
          {isLoading ? "Creando cuenta…" : "Crear cuenta"}
        </button>
      </form>
      <p className="auth-terms">
        Al crear tu cuenta aceptás los{" "}
        <Link to="/terms-of-service">Términos de servicio</Link> y la{" "}
        <Link to="/privacy-policy">Política de privacidad</Link>.
      </p>
      <p className="auth-footer">
        ¿Ya tenés cuenta? <Link to="/login">Iniciar sesión</Link>
      </p>
    </AuthLayout>
  );
}
