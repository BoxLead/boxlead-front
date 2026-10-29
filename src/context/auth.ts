import { createContext, useContext } from "react";
import type { AuthUser, LegalVersion, LoginRequest, RegisterRequest, SessionFlags } from "../api/types";

export type AuthContextValue = SessionFlags & {
  user: AuthUser | null;
  login: (body: LoginRequest, redirectTo?: string) => Promise<void>;
  register: (body: RegisterRequest, redirectTo?: string) => Promise<void>;
  socialLogin: (idToken: string, redirectTo?: string, acceptedLegal?: LegalVersion[]) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
};

export const SESSION_FLAGS_OFF: SessionFlags = {
  features: { billing: false, referrals: false, legal: false, clientErrors: false, onboarding: false, notifications: false },
  access: "FULL",
  isReseller: false,
  pendingLegal: [],
};

export function sessionFlags(user: AuthUser | null): SessionFlags {
  if (!user) return SESSION_FLAGS_OFF;
  const { features, access, isReseller, pendingLegal } = user;
  return { features, access, isReseller, pendingLegal };
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
