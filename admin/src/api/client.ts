import { ConnectionLostError, toAdminError } from "./errors";
import type { AdminMe, AdminSessionResponse, EnrollmentResponse, SessionUser } from "./types";

const DEV_API = "http://localhost:8080";

export const REQUEST_HEADERS = { "X-Requested-With": "boxlead-web" } as const;

export type SessionHooks = {
  adminSessionRequired: () => Promise<void>;
  signedOut: () => void;
  connectionLost: () => void;
};

type RequestOptions = {
  body?: unknown;
  query?: URLSearchParams;
  entry?: boolean;
  signal?: AbortSignal;
};

type Reader<T> = (res: Response) => Promise<T>;

let hooks: SessionHooks | null = null;

export function connectSession(next: SessionHooks): () => void {
  hooks = next;
  return () => {
    if (hooks === next) hooks = null;
  };
}

export function apiUrl(path: string, query?: URLSearchParams): string {
  const base = (import.meta.env.VITE_API_BASE_URL || DEV_API).replace(/\/$/, "");
  const search = query && query.size > 0 ? `?${query.toString()}` : "";
  return `${base}${path.startsWith("/") ? path : `/${path}`}${search}`;
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

async function readJson<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;
  return (await parseBody(res)) as T;
}

function readBlob(res: Response): Promise<Blob> {
  return res.blob();
}

async function send(method: string, path: string, options: RequestOptions): Promise<Response> {
  const headers: Record<string, string> = { Accept: "application/json", ...REQUEST_HEADERS };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  try {
    return await fetch(apiUrl(path, options.query), {
      method,
      headers,
      credentials: "include",
      cache: "no-store",
      signal: options.signal,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    if (!options.entry) hooks?.connectionLost();
    throw new ConnectionLostError();
  }
}

async function request<T>(method: string, path: string, options: RequestOptions, read: Reader<T>, retried = false): Promise<T> {
  const res = await send(method, path, options);
  if (res.ok) return read(res);
  const error = toAdminError(res.status, await parseBody(res));
  if (res.status === 401 && !options.entry && hooks) {
    if (error.code !== "ADMIN_SESSION_REQUIRED") {
      hooks.signedOut();
      throw error;
    }
    if (!retried) {
      try {
        await hooks.adminSessionRequired();
      } catch {
        throw error;
      }
      return request(method, path, options, read, true);
    }
  }
  throw error;
}

type Query = { query?: URLSearchParams; signal?: AbortSignal };

export const adminApi = {
  get: <T>(path: string, options: Query = {}) => request<T>("GET", path, options, readJson<T>),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, { body }, readJson<T>),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, { body }, readJson<T>),
  delete: <T>(path: string, body?: unknown) => request<T>("DELETE", path, { body }, readJson<T>),
  postBlob: (path: string, body?: unknown) => request<Blob>("POST", path, { body }, readBlob),
};

export const entryApi = {
  me: () => request<SessionUser>("GET", "/auth/me", { entry: true }, readJson<SessionUser>),
  login: (email: string, password: string) =>
    request<SessionUser>("POST", "/auth/login", { entry: true, body: { email, password } }, readJson<SessionUser>),
  logout: () => request<void>("POST", "/auth/logout", { entry: true }, readJson<void>),
  adminMe: () => request<AdminMe>("GET", "/admin/me", { entry: true }, readJson<AdminMe>),
  startEnrollment: () =>
    request<EnrollmentResponse>("POST", "/admin/mfa/enrollment", { entry: true }, readJson<EnrollmentResponse>),
  confirmEnrollment: (code: string) =>
    request<void>("POST", "/admin/mfa/confirm", { entry: true, body: { code } }, readJson<void>),
  openSession: (code: string) =>
    request<AdminSessionResponse>("POST", "/admin/session", { entry: true, body: { code } }, readJson<AdminSessionResponse>),
  closeSession: () => request<void>("DELETE", "/admin/session", { entry: true }, readJson<void>),
};
