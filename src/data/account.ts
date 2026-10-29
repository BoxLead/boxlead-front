import { api } from "../api/client";
import type { AccountView } from "../api/types";
import { setQueryData } from "./queryCache";

export type AuthOptions = {
  passwordReset: boolean;
};

export const AUTH_OPTIONS_OFF: AuthOptions = { passwordReset: false };

export async function fetchAuthOptions(): Promise<AuthOptions> {
  try {
    const data = await api.get<unknown>("/auth/options");
    return {
      passwordReset: typeof data === "object" && data !== null && "passwordReset" in data && data.passwordReset === true,
    };
  } catch {
    return AUTH_OPTIONS_OFF;
  }
}

export function requestPasswordReset(email: string): Promise<void> {
  return api.post<void>("/auth/password/forgot", { email });
}

export function resetPassword(token: string, password: string): Promise<void> {
  return api.post<void>("/auth/password/reset", { token, password });
}

export function verifyEmail(token: string): Promise<void> {
  return api.post<void>("/auth/email/verify", { token });
}

export function resendEmailVerification(): Promise<void> {
  return api.post<void>("/account/email/verification");
}

export const ACCOUNT_KEY = "/account";

export async function renameAccount(name: string): Promise<AccountView> {
  const saved = await api.patch<AccountView>(ACCOUNT_KEY, { name });
  setQueryData<AccountView>(ACCOUNT_KEY, () => saved);
  return saved;
}

export function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  return api.post<void>("/account/password", { currentPassword, newPassword });
}

export function changeEmail(password: string, newEmail: string): Promise<void> {
  return api.post<void>("/account/email", { password, newEmail });
}

export function confirmEmailChange(token: string): Promise<void> {
  return api.post<void>("/auth/email/change", { token });
}

export function revokeAllSessions(): Promise<void> {
  return api.post<void>("/auth/sessions/revoke");
}

export type DeleteAccountRequest = {
  password?: string;
  idToken?: string;
  confirmation: string;
};

export function deleteAccount(request: DeleteAccountRequest): Promise<void> {
  return api.post<void>("/account/deletion", request);
}
