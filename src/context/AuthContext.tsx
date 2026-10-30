import i18next from "i18next";
import {
  Fragment,
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api, ApiError, clearAuth } from "../api/client";
import type { AuthUser, LegalVersion, LoginRequest, RegisterRequest } from "../api/types";
import { Loading } from "../components/Loading";
import { clearQueryCache, sameData } from "../data/queryCache";
import { onSessionRefresh } from "../data/session";
import { startClientErrorReporting } from "../monitoring/clientErrors";
import { DEFAULT_APP_PATH, safeAppPath } from "../util/redirect";
import { AuthContext, sessionFlags } from "./auth";

const SESSION_ROUTES = /^\/(app|login|register|invitacion)(\/|$)/;

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const needsSession = SESSION_ROUTES.test(pathname);
  const signedIn = user !== null;
  const reportsErrors = user?.features.clientErrors === true;
  const syncing = useRef(false);
  const userRef = useRef<AuthUser | null>(null);
  const [sessionKey, setSessionKey] = useState(0);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

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

  const syncSession = useCallback(() => {
    if (syncing.current) return;
    syncing.current = true;
    api
      .me()
      .then(
        (current) => {
          const previous = userRef.current;
          if (!previous || sameData(previous, current)) return;
          if (previous.userId !== current.userId) {
            clearQueryCache();
            setSessionKey((key) => key + 1);
          }
          setUser(current);
        },
        () => undefined,
      )
      .finally(() => {
        syncing.current = false;
      });
  }, []);

  useEffect(() => {
    if (!signedIn) return;
    const syncIfVisible = () => {
      if (document.visibilityState === "visible") syncSession();
    };
    document.addEventListener("visibilitychange", syncIfVisible);
    window.addEventListener("focus", syncIfVisible);
    const stop = onSessionRefresh(syncSession);
    return () => {
      document.removeEventListener("visibilitychange", syncIfVisible);
      window.removeEventListener("focus", syncIfVisible);
      stop();
    };
  }, [signedIn, syncSession]);

  useEffect(() => {
    if (!reportsErrors) return;
    return startClientErrorReporting();
  }, [reportsErrors]);

  const clearError = useCallback(() => setError(null), []);

  const authenticate = useCallback(
    async (
      request: () => Promise<AuthUser>,
      fallbackError: string,
      redirectTo?: string,
      reloadSession = false,
    ) => {
      setError(null);
      setIsLoading(true);
      try {
        const created = await request();
        const current = reloadSession ? await api.me().catch(() => created) : created;
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
      authenticate(() => api.login(body), i18next.t("login.failed", { ns: "auth" }), redirectTo),
    [authenticate],
  );

  const register = useCallback(
    (body: RegisterRequest, redirectTo?: string) =>
      authenticate(() => api.register(body), i18next.t("register.failed", { ns: "auth" }), redirectTo, true),
    [authenticate],
  );

  const socialLogin = useCallback(
    (idToken: string, redirectTo?: string, acceptedLegal?: LegalVersion[]) =>
      authenticate(
        () => api.socialLogin(acceptedLegal ? { idToken, acceptedLegal } : { idToken }),
        i18next.t("login.failed", { ns: "auth" }),
        redirectTo,
        true,
      ),
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

  const refreshUser = useCallback(async () => {
    const current = await api.me();
    setUser(current);
  }, []);

  const value = useMemo(
    () => ({
      ...sessionFlags(user),
      user,
      login,
      register,
      socialLogin,
      logout,
      refreshUser,
      isLoading,
      error,
      clearError,
    }),
    [user, login, register, socialLogin, logout, refreshUser, isLoading, error, clearError],
  );

  return (
    <AuthContext.Provider value={value}>
      {needsSession && !sessionChecked ? <Loading /> : <Fragment key={sessionKey}>{children}</Fragment>}
    </AuthContext.Provider>
  );
}
