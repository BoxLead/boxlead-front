import { api } from "../api/client";

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
