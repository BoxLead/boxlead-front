import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  api,
  ApiError,
  clearAuth,
  getStoredToken,
  getStoredUser,
  persistAuth,
} from "../api/client";
import type {
  AuthResponse,
  AuthUser,
  LoginRequest,
  RegisterRequest,
} from "../api/types";
import { AuthContext } from "./auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const authenticate = useCallback(
    async (request: () => Promise<AuthResponse>, fallbackError: string) => {
      setError(null);
      setIsLoading(true);
      try {
        const res = await request();
        persistAuth(res);
        setToken(res.token);
        setUser({ userId: res.userId, email: res.email });
        navigate("/app/inbox", { replace: true });
      } catch (e) {
        setError(e instanceof ApiError ? e.message : fallbackError);
      } finally {
        setIsLoading(false);
      }
    },
    [navigate],
  );

  const login = useCallback(
    (body: LoginRequest) =>
      authenticate(() => api.login(body), "No pudimos iniciar sesión."),
    [authenticate],
  );

  const register = useCallback(
    (body: RegisterRequest) =>
      authenticate(() => api.register(body), "No pudimos crear la cuenta."),
    [authenticate],
  );

  const logout = useCallback(() => {
    clearAuth();
    setToken(null);
    setUser(null);
    navigate("/login", { replace: true });
  }, [navigate]);

  const value = useMemo(
    () => ({
      token,
      user,
      login,
      register,
      logout,
      isLoading,
      error,
      clearError,
    }),
    [token, user, login, register, logout, isLoading, error, clearError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
