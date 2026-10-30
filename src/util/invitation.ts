import i18next from "i18next";
import { ApiError } from "../api/client";
import { apiErrorCode } from "../api/errors";

export function invitationInvalidMessage(): string {
  return i18next.t("invitationErrors.invalid");
}

export function readInvitationToken(hash: string): string | null {
  const token = hash.startsWith("#") ? hash.slice(1) : hash;
  return token.trim() === "" ? null : token.trim();
}

export function acceptInvitationError(error: unknown, invitedEmail: string | null): string {
  const code = apiErrorCode(error);
  if (code === "INVITATION_EMAIL_MISMATCH") {
    return invitedEmail
      ? i18next.t("invitationErrors.emailMismatch", { email: invitedEmail })
      : i18next.t("invitationErrors.otherEmail");
  }
  if (code === "DEMO_ALREADY_USED") return i18next.t("invitationErrors.demoUsed");
  if (code === "DEMO_SUBSCRIPTION_ACTIVE") return i18next.t("invitationErrors.subscriptionActive");
  if (code === "DEMO_TEAM_MEMBER") return i18next.t("invitationErrors.teamMember");
  if (code === "INVITATION_INVALID") return invitationInvalidMessage();
  if (error instanceof ApiError && error.status === 429) return error.message;
  return i18next.t("invitationErrors.acceptFailed");
}
