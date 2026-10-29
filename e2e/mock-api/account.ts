import { randomBytes } from "node:crypto";
import type { MockReply, MockRequest } from "./billing.ts";

export type AccountOptions = {
  passwordReset: boolean;
  emailVerification: boolean;
  emailPending: boolean;
};

type SentEmail = { template: string; to: string; token: string | null };

type AccountToken = { purpose: "PASSWORD_RESET" | "EMAIL_VERIFICATION"; used: boolean };

type SessionUser = () => Record<string, unknown>;

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
  return { options: { passwordReset: false, emailVerification: false, emailPending: false }, sent: [], tokens: new Map() };
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

function accountFeatures(account: AccountState) {
  return {
    sessionRevocation: false,
    passwordReset: account.options.passwordReset,
    emailVerification: account.options.emailVerification,
    settings: false,
    deletion: false,
  };
}

export async function accountRoute(
  account: AccountState,
  request: MockRequest,
  sessionUser: SessionUser,
): Promise<MockReply | null> {
  const { method, path } = request;
  if (path === "/__account/options" && method === "POST") {
    const body = await request.readBody();
    account.options = {
      passwordReset: body.passwordReset === true,
      emailVerification: body.emailVerification === true,
      emailPending: body.emailPending === true,
    };
    if (account.options.emailPending) {
      account.sent.push({
        template: "EMAIL_VERIFICATION",
        to: request.userEmail,
        token: issueToken(account, "EMAIL_VERIFICATION"),
      });
    }
    return { status: 200, body: { ...account.options } };
  }
  if (path === "/auth/me" && method === "GET" && request.authed) {
    return {
      status: 200,
      body: {
        ...sessionUser(),
        account: accountFeatures(account),
        emailVerificationPending: account.options.emailVerification && account.options.emailPending,
      },
    };
  }
  if (path === "/auth/email/verify" && method === "POST") {
    if (!account.options.emailVerification) return NOT_FOUND;
    const body = await request.readBody();
    if (!spendToken(account, body.token, "EMAIL_VERIFICATION")) return INVALID_TOKEN;
    account.options.emailPending = false;
    return { status: 204 };
  }
  if (path === "/account/email/verification" && method === "POST") {
    if (!account.options.emailVerification) return NOT_FOUND;
    if (!request.authed) return { status: 401, body: { error: "Unauthorized", message: "Unauthorized" } };
    if (account.options.emailPending) {
      account.sent.push({
        template: "EMAIL_VERIFICATION",
        to: request.userEmail,
        token: issueToken(account, "EMAIL_VERIFICATION"),
      });
    }
    return { status: 202 };
  }
  if (
    account.options.emailVerification &&
    account.options.emailPending &&
    request.authed &&
    !path.startsWith("/auth/") &&
    !path.startsWith("/account") &&
    !path.startsWith("/legal/") &&
    !path.startsWith("/__")
  ) {
    return {
      status: 403,
      body: { error: "Forbidden", message: "Confirm your email first", code: "EMAIL_NOT_VERIFIED" },
    };
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
