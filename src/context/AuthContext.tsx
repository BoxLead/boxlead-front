import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  api,
  ApiError,
  clearAuth,
  getStoredUser,
  persistUser,
} from "../api/client";
import type { AuthUser, LoginRequest, RegisterRequest } from "../api/types";
import { AuthContext } from "./auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hadStoredUser = useState(() => user !== null)[0];

  useEffect(() => {
    if (!hadStoredUser) return;
    let cancelled = false;
    api.me().then(
      (current) => {
        if (cancelled) return;
        persistUser(current);
        setUser(current);
      },
      (e: unknown) => {
        if (cancelled || !(e instanceof ApiError)) return;
        if (e.status === 401 || e.status === 403) {
          clearAuth();
          setUser(null);
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [hadStoredUser]);

  const clearError = useCallback(() => setError(null), []);

  const authenticate = useCallback(
    async (request: () => Promise<AuthUser>, fallbackError: string) => {
      setError(null);
      setIsLoading(true);
      try {
        const current = await request();
        persistUser(current);
        setUser(current);
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
    void api.logout().catch(() => undefined);
    clearAuth();
    setUser(null);
    navigate("/login", { replace: true });
  }, [navigate]);

  const value = useMemo(
    () => ({ user, login, register, logout, isLoading, error, clearError }),
    [user, login, register, logout, isLoading, error, clearError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
