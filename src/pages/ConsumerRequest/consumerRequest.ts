import { api, ApiError } from "../../api/client";
import { apiErrorCode } from "../../api/errors";
import type { ConsumerRequestConfirmation, ConsumerRequestKind, ConsumerRequestReceipt } from "../../api/types";
import { SUPPORT_EMAIL } from "../../util/company";

export const DETAILS_MAX = 500;

export const REQUEST_TITLES: Record<ConsumerRequestKind, string> = {
  WITHDRAWAL: "Botón de arrepentimiento",
  CANCELLATION: "Botón de baja de servicio",
};

export function isReceipt(value: unknown): value is ConsumerRequestReceipt {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    typeof value.code === "string" &&
    value.code.trim() !== ""
  );
}

export function fallbackMailto(kind: ConsumerRequestKind, email: string): string {
  const subject = encodeURIComponent(REQUEST_TITLES[kind]);
  const body = encodeURIComponent(email.trim() === "" ? "" : `Email de mi cuenta ${email.trim()}`);
  return `mailto:${SUPPORT_EMAIL}?subject=${subject}${body ? `&body=${body}` : ""}`;
}

export function isRateLimited(error: unknown): boolean {
  return error instanceof ApiError && error.status === 429;
}

export function isConfirmation(value: unknown): value is ConsumerRequestConfirmation {
  return (
    isReceipt(value) &&
    "kind" in value &&
    (value.kind === "WITHDRAWAL" || value.kind === "CANCELLATION")
  );
}

export async function confirmConsumerRequest(token: string): Promise<ConsumerRequestConfirmation> {
  const confirmation = await api.post<unknown>("/consumer-requests/confirm", { token });
  if (!isConfirmation(confirmation)) throw new Error("Invalid confirmation");
  return confirmation;
}

export function isInvalidConfirmation(error: unknown): boolean {
  return (
    apiErrorCode(error) === "CONSUMER_REQUEST_TOKEN_INVALID" ||
    (error instanceof ApiError && (error.status === 400 || error.status === 404))
  );
}
