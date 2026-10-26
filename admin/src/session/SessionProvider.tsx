import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { connectSession, entryApi } from "../api/client";
import { AdminApiError } from "../api/errors";
import { SessionContext, stageFor, type SessionValue, type Stage } from "./session";

type Pending = { promise: Promise<void>; resolve: () => void; reject: (error: Error) => void };

const SIGNED_OUT_NOTICE = "Tu sesión se cerró. Volvé a entrar.";

function deferred(): Pending {
  let resolve: () => void = () => undefined;
  let reject: (error: Error) => void = () => undefined;
  const promise = new Promise<void>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

function statusOf(error: unknown): number | null {
  return error instanceof AdminApiError ? error.status : null;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [stage, setStage] = useState<Stage>({ kind: "checking" });
  const [connectionLost, setConnectionLost] = useState(false);
  const [reauthenticating, setReauthenticating] = useState(false);
  const pending = useRef<Pending | null>(null);
  const email = useRef("");

  const settleReauth = useCallback((error?: Error) => {
    const current = pending.current;
    pending.current = null;
    setReauthenticating(false);
    if (!current) return;
    if (error) current.reject(error);
    else current.resolve();
  }, []);

  const loadAdmin = useCallback(async (enrolled = false) => {
    try {
      const me = await entryApi.adminMe();
      setStage(stageFor(me, enrolled));
    } catch (error) {
      const status = statusOf(error);
      if (status === 401) setStage({ kind: "signed-out", notice: null });
      else if (status === 403 || status === 404) setStage({ kind: "no-access", email: email.current });
      else setStage({ kind: "failed" });
    }
  }, []);

  const evaluate = useCallback(
    (cancelled: () => boolean = () => false) =>
      entryApi.me().then(
        (user) => {
          if (cancelled()) return;
          email.current = user.email;
          return loadAdmin();
        },
        (error: unknown) => {
          if (cancelled()) return;
          setStage(statusOf(error) === 401 ? { kind: "signed-out", notice: null } : { kind: "failed" });
        },
      ),
    [loadAdmin],
  );

  useEffect(() => {
    let cancelled = false;
    void evaluate(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [evaluate]);

  useEffect(
    () =>
      connectSession({
        adminSessionRequired: () => {
          if (!pending.current) {
            pending.current = deferred();
            setReauthenticating(true);
          }
          return pending.current.promise;
        },
        signedOut: () => {
          settleReauth(new Error("signed out"));
          setStage({ kind: "signed-out", notice: SIGNED_OUT_NOTICE });
        },
        connectionLost: () => setConnectionLost(true),
      }),
    [settleReauth],
  );

  const refreshAfterLock = useCallback(
    async (error: unknown, enrolled: boolean) => {
      if (error instanceof AdminApiError && error.code === "MFA_LOCKED") await loadAdmin(enrolled);
      throw error;
    },
    [loadAdmin],
  );

  const value = useMemo<SessionValue>(
    () => ({
      stage,
      connectionLost,
      reauthenticating,
      retry: async () => {
        setStage({ kind: "checking" });
        await evaluate();
      },
      signIn: async (address, password) => {
        const user = await entryApi.login(address, password);
        email.current = user.email;
        await loadAdmin();
      },
      confirmEnrollment: async (code) => {
        try {
          await entryApi.confirmEnrollment(code);
        } catch (error) {
          await refreshAfterLock(error, false);
        }
        await loadAdmin(true);
      },
      openSession: async (code) => {
        try {
          await entryApi.openSession(code);
        } catch (error) {
          await refreshAfterLock(error, stage.kind === "code" && stage.enrolled);
        }
        await loadAdmin();
      },
      reauthenticate: async (code) => {
        await entryApi.openSession(code);
        const me = await entryApi.adminMe();
        setStage(stageFor(me));
        settleReauth();
      },
      cancelReauthentication: () => settleReauth(new Error("canceled")),
      signOut: async () => {
        settleReauth(new Error("signed out"));
        await entryApi.closeSession().catch(() => undefined);
        await entryApi.logout().catch(() => undefined);
        email.current = "";
        setStage({ kind: "signed-out", notice: null });
      },
    }),
    [stage, connectionLost, reauthenticating, evaluate, loadAdmin, refreshAfterLock, settleReauth],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
