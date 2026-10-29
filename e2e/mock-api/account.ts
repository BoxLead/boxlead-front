import { randomBytes } from "node:crypto";
import type { MockReply, MockRequest } from "./billing.ts";

export type AccountOptions = {
  passwordReset: boolean;
};

type SentEmail = { template: string; to: string; token: string | null };

type AccountToken = { purpose: "PASSWORD_RESET"; used: boolean };

export type AccountState = {
  options: AccountOptions;
  sent: SentEmail[];
  tokens: Map<string, AccountToken>;
};

const MIN_PASSWORD_LENGTH = 8;
const NOT_FOUND: MockReply = { status: 404, body: { error: "Not found", message: "Not found" } };
const INVALID_TOKEN: MockReply = {
  status: 400,
  body: { error: "Bad Request", message: "The link is invalid or expired", code: "INVALID_TOKEN" },
};

export function buildAccount(): AccountState {
  return { options: { passwordReset: false }, sent: [], tokens: new Map() };
}

function issueToken(account: AccountState, purpose: AccountToken["purpose"]): string {
  for (const token of account.tokens.values()) {
    if (token.purpose === purpose) token.used = true;
  }
  const token = randomBytes(24).toString("base64url");
  account.tokens.set(token, { purpose, used: false });
  return token;
}

function spendToken(account: AccountState, value: unknown, purpose: AccountToken["purpose"]): boolean {
  const token = typeof value === "string" ? account.tokens.get(value) : undefined;
  if (!token || token.used || token.purpose !== purpose) return false;
  token.used = true;
  return true;
}

export async function accountRoute(account: AccountState, request: MockRequest): Promise<MockReply | null> {
  const { method, path } = request;
  if (path === "/__account/options" && method === "POST") {
    const body = await request.readBody();
    account.options = { passwordReset: body.passwordReset === true };
    return { status: 200, body: { ...account.options } };
  }
  if (path === "/__account/sent" && method === "GET") {
    return { status: 200, body: account.sent };
  }
  if (path === "/auth/options" && method === "GET") {
    return { status: 200, body: { passwordReset: account.options.passwordReset } };
  }
  if (path === "/auth/password/forgot" && method === "POST") {
    if (!account.options.passwordReset) return NOT_FOUND;
    const body = await request.readBody();
    if (typeof body.email !== "string" || !body.email.includes("@")) {
      return { status: 400, body: { error: "Validation failed", message: "Validation failed" } };
    }
    const email = body.email.trim().toLowerCase();
    if (email === request.userEmail) {
      account.sent.push({ template: "PASSWORD_RESET", to: email, token: issueToken(account, "PASSWORD_RESET") });
    }
    return { status: 202 };
  }
  if (path === "/auth/password/reset" && method === "POST") {
    if (!account.options.passwordReset) return NOT_FOUND;
    const body = await request.readBody();
    if (typeof body.password !== "string" || body.password.length < MIN_PASSWORD_LENGTH) {
      return { status: 400, body: { error: "Validation failed", message: "Validation failed" } };
    }
    if (!spendToken(account, body.token, "PASSWORD_RESET")) return INVALID_TOKEN;
    account.sent.push({ template: "PASSWORD_CHANGED", to: request.userEmail, token: null });
    return { status: 204 };
  }
  return null;
}
