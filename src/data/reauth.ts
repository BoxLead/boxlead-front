export const REAUTH_INTENT = "reauth";
export const REAUTH_PATH = "/reingresar";
export const DELETE_ACCOUNT_PATH = "/app/cuenta?borrar=1";

let reauthToken: string | null = null;

export function keepReauthToken(token: string) {
  reauthToken = token;
}

export function peekReauthToken(): string | null {
  return reauthToken;
}

export function clearReauthToken() {
  reauthToken = null;
}
