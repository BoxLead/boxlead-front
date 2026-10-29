import { ApiError } from "../api/client";
import { apiErrorCode } from "../api/errors";

export function readFragmentToken(hash: string): string | null {
  const token = (hash.startsWith("#") ? hash.slice(1) : hash).trim();
  return token === "" ? null : token;
}

export function takeFragmentToken(): string | null {
  const { hash, pathname, search } = window.location;
  if (hash) window.history.replaceState(window.history.state, "", `${pathname}${search}`);
  return readFragmentToken(hash);
}

export function isInvalidLink(error: unknown): boolean {
  return apiErrorCode(error) === "INVALID_TOKEN" || (error instanceof ApiError && error.status === 404);
}

export function isRateLimited(error: unknown): boolean {
  return error instanceof ApiError && error.status === 429;
}
