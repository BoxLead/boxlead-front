import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api, ApiError, clearAuth } from "../api/client";
import type { AuthUser, LoginRequest, RegisterRequest } from "../api/types";
import { Loading } from "../components/Loading";
import { clearQueryCache } from "../data/queryCache";
import { DEFAULT_APP_PATH, safeAppPath } from "../util/redirect";
import { AuthContext } from "./auth";

const SESSION_ROUTES = /^\/(app|login|register)(\/|$)/;

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const needsSession = SESSION_ROUTES.test(pathname);

  useEffect(() => {
    if (sessionChecked || !needsSession) return;
    let cancelled = false;
    api.me().then(
      (current) => {
        if (cancelled) return;
        setUser(current);
        setSessionChecked(true);
      },
      () => {
        if (cancelled) return;
        setUser(null);
        setSessionChecked(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [sessionChecked, needsSession]);

  const clearError = useCallback(() => setError(null), []);

  const authenticate = useCallback(
    async (
      request: () => Promise<AuthUser>,
      fallbackError: string,
      redirectTo?: string,
    ) => {
      setError(null);
      setIsLoading(true);
      try {
        const current = await request();
        clearQueryCache();
        setUser(current);
        setSessionChecked(true);
        navigate(safeAppPath(redirectTo) ?? DEFAULT_APP_PATH, { replace: true });
      } catch (e) {
        setError(e instanceof ApiError ? e.message : fallbackError);
      } finally {
        setIsLoading(false);
      }
    },
    [navigate],
  );

  const login = useCallback(
    (body: LoginRequest, redirectTo?: string) =>
      authenticate(() => api.login(body), "No pudimos iniciar sesión.", redirectTo),
    [authenticate],
  );

  const register = useCallback(
    (body: RegisterRequest, redirectTo?: string) =>
      authenticate(() => api.register(body), "No pudimos crear la cuenta.", redirectTo),
    [authenticate],
  );

  const logout = useCallback(() => {
    void api.logout().catch(() => undefined);
    clearAuth();
    clearQueryCache();
    startTransition(() => {
      setUser(null);
      navigate("/login", { replace: true });
    });
  }, [navigate]);

  const value = useMemo(
    () => ({ user, login, register, logout, isLoading, error, clearError }),
    [user, login, register, logout, isLoading, error, clearError],
  );

  return (
    <AuthContext.Provider value={value}>
      {needsSession && !sessionChecked ? <Loading /> : children}
    </AuthContext.Provider>
  );
}
