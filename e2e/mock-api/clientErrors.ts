import type { MockReply } from "./billing.ts";

export type ClientErrorReport = {
  kind: "error" | "unhandledrejection" | "boundary";
  message: string;
  route: string;
  release: string;
};

const KINDS = ["error", "unhandledrejection", "boundary"];
const LIMITS = { message: 300, route: 200, release: 64 };
export const CLIENT_ERRORS_PER_WINDOW = 20;

const received: ClientErrorReport[] = [];

function text(value: unknown, limit: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= limit;
}

function parse(body: Record<string, unknown>): ClientErrorReport | null {
  const { kind, message, route, release } = body;
  if (typeof kind !== "string" || !KINDS.includes(kind)) return null;
  if (!text(message, LIMITS.message) || !text(route, LIMITS.route) || !text(release, LIMITS.release)) return null;
  return { kind: kind as ClientErrorReport["kind"], message, route, release };
}

export function receiveClientError(enabled: boolean, body: Record<string, unknown>): MockReply {
  if (!enabled) return { status: 404, body: { error: "Not Found", message: "Not Found" } };
  if (received.length >= CLIENT_ERRORS_PER_WINDOW) {
    return { status: 429, body: { error: "Too Many Requests", message: "Too Many Requests" } };
  }
  const report = parse(body);
  if (!report) return { status: 400, body: { error: "Bad Request", message: "Validation failed" } };
  received.push(report);
  return { status: 204 };
}

export function receivedClientErrors(): MockReply {
  return { status: 200, body: [...received] };
}

export function clearClientErrors(): void {
  received.length = 0;
}
