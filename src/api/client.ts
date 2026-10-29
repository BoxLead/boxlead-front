import { loginPathFor } from "../util/redirect";
import type {
  Access,
  AuthUser,
  Features,
  LegalDocumentKind,
  LegalVersion,
  LoginRequest,
  RegisterRequest,
  SocialLoginRequest,
} from "./types";

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

const CORE_PROXY_PREFIX = "/api";
const AGENT_PROXY_PREFIX = "/agent-api";

function buildUrl(configured: string | undefined, proxyPrefix: string, path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const base = configured?.replace(/\/$/, "");
  return base ? `${base}${normalized}` : `${proxyPrefix}${normalized}`;
}

export function apiUrl(path: string): string {
  return buildUrl(import.meta.env.VITE_API_BASE_URL, CORE_PROXY_PREFIX, path);
}

export function agentApiUrl(path: string): string {
  return buildUrl(import.meta.env.VITE_AGENT_API_BASE_URL, AGENT_PROXY_PREFIX, path);
}

export const REQUEST_HEADERS = {
  [CSRF_HEADER]: CSRF_HEADER_VALUE,
} as const;

function readName(value: object): string | null {
  if (!("name" in value) || typeof value.name !== "string") return null;
  const trimmed = value.name.trim();
  return trimmed === "" ? null : trimmed;
}

const LEGAL_KINDS: readonly LegalDocumentKind[] = [
  "TERMS",
  "PRIVACY",
  "ADHESION_CONTRACT",
  "RESELLER_AGREEMENT",
  "DATA_PROCESSING",
];

function readFeatures(value: object): Features {
  const features = "features" in value ? value.features : null;
  if (!features || typeof features !== "object") return { billing: false, referrals: false, legal: false };
  return {
    billing: "billing" in features && features.billing === true,
    referrals: "referrals" in features && features.referrals === true,
    legal: "legal" in features && features.legal === true,
  };
}

function readAccess(value: object): Access {
  return "access" in value && value.access === "RESTRICTED" ? "RESTRICTED" : "FULL";
}

function isLegalVersion(item: unknown): item is LegalVersion {
  return (
    typeof item === "object" &&
    item !== null &&
    "kind" in item &&
    "version" in item &&
    LEGAL_KINDS.some((kind) => kind === item.kind) &&
    typeof item.version === "string"
  );
}

function readPendingLegal(value: object): LegalVersion[] {
  if (!("pendingLegal" in value) || !Array.isArray(value.pendingLegal)) return [];
  return value.pendingLegal
    .filter(isLegalVersion)
    .map(({ kind, version }) => ({ kind, version }));
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
    return {
      userId: value.userId,
      email: value.email,
      name: readName(value),
      features: readFeatures(value),
      access: readAccess(value),
      isReseller: "isReseller" in value && value.isReseller === true,
      pendingLegal: readPendingLegal(value),
    };
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

const TOO_MANY_REQUESTS_MESSAGE = "Hiciste demasiados intentos seguidos. Probá de nuevo en un rato.";

const CODE_MESSAGES: Record<string, string> = {
  ACCOUNT_EXISTS_WITH_PASSWORD:
    "Ya tenés una cuenta con este email. Entrá con tu email y contraseña.",
  PLAN_REQUIRED: "Necesitás un plan activo para hacer esto.",
  PLAN_LIMIT_REACHED: "Llegaste al límite de tu plan.",
  ENTITLEMENTS_UNAVAILABLE: "No pudimos revisar tu plan. Probá de nuevo en unos minutos.",
  LEGAL_ACCEPTANCE_REQUIRED: "Para seguir tenés que aceptar los términos y la política de privacidad vigentes.",
};

export type PlanErrorCode = "PLAN_REQUIRED" | "PLAN_LIMIT_REACHED";

export type PlanErrorListener = (code: PlanErrorCode, path: string | null) => void;

const planErrorListeners = new Set<PlanErrorListener>();

export function onPlanError(listener: PlanErrorListener): () => void {
  planErrorListeners.add(listener);
  return () => {
    planErrorListeners.delete(listener);
  };
}

function codeOf(data: unknown): string | null {
  if (!data || typeof data !== "object" || !("code" in data)) return null;
  const code = (data as { code: unknown }).code;
  return typeof code === "string" ? code : null;
}

function errorMessage(status: number, data: unknown): string {
  if (status === 429) return TOO_MANY_REQUESTS_MESSAGE;
  const code = codeOf(data);
  if (code && code in CODE_MESSAGES) return CODE_MESSAGES[code];
  if (data && typeof data === "object" && "message" in data) {
    const m = (data as { message: unknown }).message;
    if (typeof m === "string") return m;
  }
  return `Request failed (${status})`;
}

export function toApiError(status: number, data: unknown, path: string | null = null): ApiError {
  const code = codeOf(data);
  if (status === 402 && (code === "PLAN_REQUIRED" || code === "PLAN_LIMIT_REACHED")) {
    planErrorListeners.forEach((listener) => listener(code, path));
  }
  return new ApiError(errorMessage(status, data), status, data);
}

export async function errorFromResponse(res: Response): Promise<ApiError> {
  return toApiError(res.status, await parseBody(res));
}

type UrlBuilder = (path: string) => string;

export function handleUnauthorized(): void {
  clearAuthAndGoLogin();
}

async function send<T>(
  url: UrlBuilder,
  method: string,
  path: string,
  options?: { body?: unknown; skipAuth?: boolean },
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...REQUEST_HEADERS,
  };
  if (options?.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url(path), {
    method,
    headers,
    credentials: "include",
    body:
      options?.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (res.status === 401 && !options?.skipAuth) {
    handleUnauthorized();
  }

  const data = await parseBody(res);

  if (res.status === 204) {
    return undefined as T;
  }

  if (!res.ok) {
    throw toApiError(res.status, data, path);
  }

  return data as T;
}

function request<T>(
  method: string,
  path: string,
  options?: { body?: unknown; skipAuth?: boolean },
): Promise<T> {
  return send<T>(apiUrl, method, path, options);
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

  socialLogin: (body: SocialLoginRequest) =>
    requestUser("POST", "/auth/social", body),

  me: () => requestUser("GET", "/auth/me"),

  logout: () => request<void>("POST", "/auth/logout", { skipAuth: true }),
};

export const agentApi = {
  get: <T>(path: string) => send<T>(agentApiUrl, "GET", path),

  post: <T>(path: string, body?: unknown) => send<T>(agentApiUrl, "POST", path, { body }),

  put: <T>(path: string, body: unknown) => send<T>(agentApiUrl, "PUT", path, { body }),

  delete: (path: string) => send<void>(agentApiUrl, "DELETE", path),
};
