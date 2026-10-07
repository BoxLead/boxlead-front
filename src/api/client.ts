import { loginPathFor } from "../util/redirect";
import type { AuthUser, LoginRequest, RegisterRequest } from "./types";

const CSRF_HEADER = "X-Requested-With";
const CSRF_HEADER_VALUE = "boxlead-web";

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown | undefined;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export function apiUrl(path: string): string {
  const configured = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "");
  if (configured) {
    return `${configured}${path.startsWith("/") ? path : `/${path}`}`;
  }
  return `/api${path.startsWith("/") ? path : `/${path}`}`;
}

function toAuthUser(value: unknown): AuthUser | null {
  if (
    value &&
    typeof value === "object" &&
    "userId" in value &&
    "email" in value &&
    typeof value.userId === "string" &&
    typeof value.email === "string"
  ) {
    return { userId: value.userId, email: value.email };
  }
  return null;
}

export function clearAuth(): void {
  sessionStorage.clear();
}

function clearAuthAndGoLogin(): void {
  clearAuth();
  const { pathname, search } = window.location;
  if (pathname.startsWith("/app")) {
    window.location.assign(loginPathFor(`${pathname}${search}`));
  }
}

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function errorMessage(status: number, data: unknown): string {
  if (data && typeof data === "object" && "message" in data) {
    const m = (data as { message: unknown }).message;
    if (typeof m === "string") return m;
  }
  return `Request failed (${status})`;
}

async function request<T>(
  method: string,
  path: string,
  options?: { body?: unknown; skipAuth?: boolean },
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    [CSRF_HEADER]: CSRF_HEADER_VALUE,
  };
  if (options?.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(apiUrl(path), {
    method,
    headers,
    credentials: "include",
    body:
      options?.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (res.status === 401 && !options?.skipAuth) {
    clearAuthAndGoLogin();
  }

  const data = await parseBody(res);

  if (res.status === 204) {
    return undefined as T;
  }

  if (!res.ok) {
    throw new ApiError(errorMessage(res.status, data), res.status, data);
  }

  return data as T;
}

async function requestUser(
  method: string,
  path: string,
  body?: unknown,
): Promise<AuthUser> {
  const data = await request<unknown>(method, path, { body, skipAuth: true });
  const user = toAuthUser(data);
  if (!user) {
    throw new ApiError("Respuesta de sesión inválida.", 500, data);
  }
  return user;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),

  post: <T>(path: string, body?: unknown) => request<T>("POST", path, { body }),

  patch: <T>(path: string, body: unknown) =>
    request<T>("PATCH", path, { body }),

  put: <T>(path: string, body: unknown) => request<T>("PUT", path, { body }),

  delete: (path: string) => request<void>("DELETE", path),

  login: (body: LoginRequest) => requestUser("POST", "/auth/login", body),

  register: (body: RegisterRequest) =>
    requestUser("POST", "/auth/register", body),

  me: () => requestUser("GET", "/auth/me"),

  logout: () => request<void>("POST", "/auth/logout", { skipAuth: true }),
};
