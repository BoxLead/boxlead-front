import { api, ApiError } from "../api/client";
import { isChunkLoadError } from "../routing/chunkRetry";
import { messageOf, sanitizeMessage, sanitizeRelease, sanitizeRoute } from "./sanitize";

export type ClientErrorKind = "error" | "unhandledrejection" | "boundary";

export type ClientErrorReport = {
  kind: ClientErrorKind;
  message: string;
  route: string;
  release: string;
};

export type ClientErrorSource = { filename?: string; stack?: string };

export type ReporterDeps = {
  send: (report: ClientErrorReport) => Promise<void>;
  origin: () => string;
  pathname: () => string;
  release: string;
};

export const MAX_REPORTS = 10;
export const CLIENT_ERRORS_PATH = "/client-errors";

const STOP_STATUSES = new Set([401, 403, 404, 429]);
const EXTENSION_SOURCE = /\b[a-z-]*extension:\/\//i;
const OPAQUE_SCRIPT_ERROR = /^script error\.?$/i;

export type ClientErrorReporter = {
  setEnabled: (enabled: boolean) => void;
  report: (kind: ClientErrorKind, error: unknown, source?: ClientErrorSource) => void;
};

function stackOf(error: unknown): string {
  return error instanceof Error && typeof error.stack === "string" ? error.stack : "";
}

function originOf(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

function fromElsewhere(error: unknown, source: ClientErrorSource | undefined, origin: string): boolean {
  const filename = source?.filename ?? "";
  if (filename !== "" && originOf(filename) !== origin) return true;
  return EXTENSION_SOURCE.test(source?.stack ?? stackOf(error));
}

export function createClientErrorReporter(deps: ReporterDeps): ClientErrorReporter {
  let enabled = false;
  let stopped = false;
  let attempts = 0;
  const seen = new Set<string>();

  function shouldSkip(kind: ClientErrorKind, error: unknown, source: ClientErrorSource | undefined, raw: string): boolean {
    if (!enabled || stopped || attempts >= MAX_REPORTS) return true;
    if (isChunkLoadError(error)) return true;
    if (kind === "error" && OPAQUE_SCRIPT_ERROR.test(raw.trim())) return true;
    return fromElsewhere(error, source, deps.origin());
  }

  function report(kind: ClientErrorKind, error: unknown, source?: ClientErrorSource): void {
    try {
      const raw = messageOf(error);
      if (shouldSkip(kind, error, source, raw)) return;
      const message = sanitizeMessage(raw);
      if (message === "" || seen.has(message)) return;
      seen.add(message);
      attempts += 1;
      const body: ClientErrorReport = {
        kind,
        message,
        route: sanitizeRoute(deps.pathname()),
        release: sanitizeRelease(deps.release),
      };
      deps.send(body).catch((failure: unknown) => {
        if (failure instanceof ApiError && STOP_STATUSES.has(failure.status)) stopped = true;
      });
    } catch {
      return;
    }
  }

  return {
    setEnabled(value: boolean) {
      enabled = value;
    },
    report,
  };
}

export const clientErrors = createClientErrorReporter({
  send: (report) => api.report(CLIENT_ERRORS_PATH, report),
  origin: () => window.location.origin,
  pathname: () => window.location.pathname,
  release: __BOXLEAD_RELEASE__,
});

export function reportClientError(kind: ClientErrorKind, error: unknown, source?: ClientErrorSource): void {
  clientErrors.report(kind, error, source);
}

function onError(event: ErrorEvent): void {
  reportClientError("error", event.error ?? event.message, { filename: event.filename });
}

function onRejection(event: PromiseRejectionEvent): void {
  reportClientError("unhandledrejection", event.reason);
}

export function startClientErrorReporting(): () => void {
  clientErrors.setEnabled(true);
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
  return () => {
    clientErrors.setEnabled(false);
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
  };
}
