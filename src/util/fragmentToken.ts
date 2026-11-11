import { ApiError } from "../api/client";
import { apiErrorCode } from "../api/errors";
import { isTokenPath } from "./tokenPaths";

type HeldToken = { pathname: string; token: string | null };

let held: HeldToken | null = null;

export function readFragmentToken(hash: string): string | null {
  const token = (hash.startsWith("#") ? hash.slice(1) : hash).trim();
  return token === "" ? null : token;
}

export function holdFragmentToken(): void {
  const { hash, pathname, search } = window.location;
  if (!hash || !isTokenPath(pathname)) return;
  held = { pathname, token: readFragmentToken(hash) };
  window.history.replaceState(window.history.state, "", `${pathname}${search}`);
}

export function takeFragmentToken(): string | null {
  holdFragmentToken();
  const current = held;
  held = null;
  return current && current.pathname === window.location.pathname ? current.token : null;
}

export function isInvalidLink(error: unknown): boolean {
  return apiErrorCode(error) === "INVALID_TOKEN" || (error instanceof ApiError && error.status === 404);
}

export function isRateLimited(error: unknown): boolean {
  return error instanceof ApiError && error.status === 429;
}
