import { ApiError } from "./client";
import type { ApiErrorCode, FieldError } from "./types";

const ERROR_CODES: readonly ApiErrorCode[] = [
  "PLAN_REQUIRED",
  "PLAN_LIMIT_REACHED",
  "ENTITLEMENTS_UNAVAILABLE",
  "SUBSCRIPTION_EXISTS",
  "SAME_PLAN",
  "SUBSCRIPTION_NOT_ACTIVE",
  "SUBSCRIPTION_CANCELING",
  "DEMO_ALREADY_USED",
  "INVITATION_INVALID",
  "INVITATION_EMAIL_MISMATCH",
  "LEGAL_ACCEPTANCE_REQUIRED",
  "ACCOUNT_EXISTS_WITH_PASSWORD",
  "BILLING_PROFILE_REQUIRED",
  "PROVIDER_UNAVAILABLE",
  "CHECKOUT_PENDING",
  "DEMO_SUBSCRIPTION_ACTIVE",
  "DEMO_TEAM_MEMBER",
  "INVALID_TOKEN",
  "EMAIL_NOT_VERIFIED",
];

function errorBody(error: unknown): object | null {
  if (!(error instanceof ApiError)) return null;
  return typeof error.body === "object" && error.body !== null ? error.body : null;
}

export function apiErrorCode(error: unknown): ApiErrorCode | null {
  const body = errorBody(error);
  if (!body || !("code" in body)) return null;
  return ERROR_CODES.find((code) => code === body.code) ?? null;
}

function isFieldError(item: unknown): item is FieldError {
  return (
    typeof item === "object" &&
    item !== null &&
    "field" in item &&
    "message" in item &&
    typeof item.field === "string" &&
    typeof item.message === "string"
  );
}

export function apiFieldErrors(error: unknown): FieldError[] {
  const body = errorBody(error);
  if (!body || !("fields" in body) || !Array.isArray(body.fields)) return [];
  return body.fields.filter(isFieldError).map(({ field, message }) => ({ field, message }));
}
