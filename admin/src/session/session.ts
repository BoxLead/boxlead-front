import { createContext, useContext } from "react";
import type { AdminMe } from "../api/types";

export type Stage =
  | { kind: "checking" }
  | { kind: "failed" }
  | { kind: "signed-out"; notice: string | null }
  | { kind: "no-access"; email: string }
  | { kind: "enroll"; me: AdminMe }
  | { kind: "enrollment-closed"; me: AdminMe }
  | { kind: "code"; me: AdminMe; enrolled: boolean }
  | { kind: "ready"; me: AdminMe };

export type SessionValue = {
  stage: Stage;
  connectionLost: boolean;
  reauthenticating: boolean;
  retry: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  confirmEnrollment: (code: string) => Promise<void>;
  openSession: (code: string) => Promise<void>;
  reauthenticate: (code: string) => Promise<void>;
  cancelReauthentication: () => void;
  signOut: () => Promise<void>;
};

export const SessionContext = createContext<SessionValue | null>(null);

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used within SessionProvider");
  return value;
}

export function useAdmin(): AdminMe {
  const { stage } = useSession();
  if (stage.kind !== "ready") throw new Error("useAdmin needs an open admin session");
  return stage.me;
}

export function isFuture(iso: string | null, now = Date.now()): boolean {
  return iso !== null && Date.parse(iso) > now;
}

export function stageFor(me: AdminMe, enrolled = false, now = Date.now()): Stage {
  if (me.roles.length === 0) return { kind: "no-access", email: me.email };
  if (!me.factorConfirmed) {
    return isFuture(me.enrollmentOpenUntil, now) ? { kind: "enroll", me } : { kind: "enrollment-closed", me };
  }
  if (isFuture(me.adminSessionExpiresAt, now)) return { kind: "ready", me };
  return { kind: "code", me, enrolled };
}
