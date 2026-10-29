import { randomBytes } from "node:crypto";
import type { MockReply, MockRequest } from "./billing.ts";

export type AccountOptions = {
  passwordReset: boolean;
  emailVerification: boolean;
  emailPending: boolean;
  emailChange: boolean;
  socialOnly: boolean;
  subscriptionOpen: boolean;
};

type AccountProfile = {
  name: string | null;
  email: string | null;
  pendingEmail: string | null;
  password: string;
};

type SentEmail = { template: string; to: string; token: string | null };

type AccountToken = { purpose: "PASSWORD_RESET" | "EMAIL_VERIFICATION" | "EMAIL_CHANGE"; used: boolean };

type SessionUser = () => Record<string, unknown>;

export type AccountState = {
  options: AccountOptions;
  profile: AccountProfile;
  sent: SentEmail[];
  tokens: Map<string, AccountToken>;
};

const MIN_PASSWORD_LENGTH = 8;
const WRONG_PASSWORD: MockReply = {
  status: 400,
  body: { error: "Bad Request", message: "The password is not correct", code: "WRONG_PASSWORD" },
};
const UNAUTHORIZED: MockReply = { status: 401, body: { error: "Unauthorized", message: "Unauthorized" } };
const NOT_FOUND: MockReply = { status: 404, body: { error: "Not found", message: "Not found" } };
const INVALID_TOKEN: MockReply = {
  status: 400,
  body: { error: "Bad Request", message: "The link is invalid or expired", code: "INVALID_TOKEN" },
};

export function buildAccount(): AccountState {
  return {
    options: {
      passwordReset: false,
      emailVerification: false,
      emailPending: false,
      emailChange: false,
      socialOnly: false,
      subscriptionOpen: false,
    },
    profile: { name: null, email: null, pendingEmail: null, password: "demo1234" },
    sent: [],
    tokens: new Map(),
  };
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
    sessionRevocation: true,
    passwordReset: account.options.passwordReset,
    emailVerification: account.options.emailVerification,
    settings: true,
    deletion: true,
    emailChange: account.options.emailChange,
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
      emailChange: body.emailChange === true,
      socialOnly: body.socialOnly === true,
      subscriptionOpen: body.subscriptionOpen === true,
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
    const user = sessionUser();
    return {
      status: 200,
      body: {
        ...user,
        email: account.profile.email ?? user.email,
        name: account.profile.name ?? user.name,
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
  const settingsReply = await settingsRoute(account, request, sessionUser);
  if (settingsReply) return settingsReply;
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

function accountView(account: AccountState, sessionUser: SessionUser) {
  const user = sessionUser();
  const social = account.options.socialOnly;
  return {
    name: account.profile.name ?? (typeof user.name === "string" ? user.name : null),
    email: account.profile.email ?? String(user.email),
    pendingEmail: account.profile.pendingEmail,
    emailVerified: social || !account.options.emailPending,
    hasPassword: !social,
    providers: social ? ["GOOGLE"] : [],
  };
}

async function settingsRoute(
  account: AccountState,
  request: MockRequest,
  sessionUser: SessionUser,
): Promise<MockReply | null> {
  const { method, path } = request;
  if (path === "/auth/sessions/revoke" && method === "POST") {
    if (!request.authed) return UNAUTHORIZED;
    return { status: 204, headers: { "Set-Cookie": "boxlead_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax" } };
  }
  if (path === "/auth/email/change" && method === "POST") {
    if (!account.options.emailChange) return NOT_FOUND;
    const body = await request.readBody();
    if (!spendToken(account, body.token, "EMAIL_CHANGE") || !account.profile.pendingEmail) return INVALID_TOKEN;
    account.profile.email = account.profile.pendingEmail;
    account.profile.pendingEmail = null;
    return { status: 204 };
  }
  if (!path.startsWith("/account") || path === "/account/email/verification") return null;
  if (!request.authed) return UNAUTHORIZED;
  if (path === "/account" && method === "GET") return { status: 200, body: accountView(account, sessionUser) };
  if (path === "/account" && method === "PATCH") {
    const body = await request.readBody();
    if (typeof body.name !== "string" || body.name.length > 100) return { status: 400, body: { error: "Validation failed", message: "Validation failed" } };
    account.profile.name = body.name.trim() === "" ? null : body.name.trim();
    return { status: 200, body: accountView(account, sessionUser) };
  }
  if (path === "/account/password" && method === "POST") {
    const body = await request.readBody();
    if (account.options.socialOnly) {
      return { status: 409, body: { error: "Conflict", message: "No password", code: "PASSWORD_REQUIRED" } };
    }
    if (typeof body.newPassword !== "string" || body.newPassword.length < MIN_PASSWORD_LENGTH) {
      return { status: 400, body: { error: "Validation failed", message: "Validation failed" } };
    }
    if (body.currentPassword !== account.profile.password) return WRONG_PASSWORD;
    account.profile.password = body.newPassword;
    account.sent.push({ template: "PASSWORD_CHANGED", to: request.userEmail, token: null });
    return { status: 204 };
  }
  if (path === "/account/deletion" && method === "POST") {
    const body = await request.readBody();
    if (body.confirmation !== "BORRAR") {
      return { status: 400, body: { error: "Bad Request", message: "Confirm", code: "CONFIRMATION_MISMATCH" } };
    }
    if (account.options.socialOnly) {
      if (typeof body.idToken !== "string" || body.idToken === "") {
        return { status: 400, body: { error: "Bad Request", message: "Sign in again", code: "REAUTHENTICATION_REQUIRED" } };
      }
    } else if (body.password !== account.profile.password) {
      return WRONG_PASSWORD;
    }
    if (account.options.subscriptionOpen) {
      return { status: 409, body: { error: "Conflict", message: "Cancel first", code: "SUBSCRIPTION_OPEN" } };
    }
    account.sent.push({ template: "ACCOUNT_DELETED", to: request.userEmail, token: null });
    return { status: 204, headers: { "Set-Cookie": "boxlead_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax" } };
  }
  if (path === "/account/email" && method === "POST") {
    if (!account.options.emailChange) {
      return { status: 409, body: { error: "Conflict", message: "Emails are not being sent yet", code: "EMAIL_UNAVAILABLE" } };
    }
    const body = await request.readBody();
    if (body.password !== account.profile.password) return WRONG_PASSWORD;
    if (typeof body.newEmail !== "string" || !body.newEmail.includes("@")) {
      return { status: 400, body: { error: "Validation failed", message: "Validation failed" } };
    }
    const email = body.newEmail.trim().toLowerCase();
    if (email === (account.profile.email ?? request.userEmail)) {
      return { status: 400, body: { error: "Bad Request", message: "Same email", code: "SAME_EMAIL" } };
    }
    account.profile.pendingEmail = email;
    account.sent.push({ template: "EMAIL_CHANGE", to: email, token: issueToken(account, "EMAIL_CHANGE") });
    return { status: 202 };
  }
  return null;
}
