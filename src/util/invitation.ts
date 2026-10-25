import { ApiError } from "../api/client";
import { apiErrorCode } from "../api/errors";

export const INVITATION_INVALID_MESSAGE =
  "Este link de invitación no sirve. Puede que haya vencido, que ya se haya usado o que lo hayan revocado. Pedile uno nuevo a quien te invitó.";

export function readInvitationToken(hash: string): string | null {
  const token = hash.startsWith("#") ? hash.slice(1) : hash;
  return token.trim() === "" ? null : token.trim();
}

export function acceptInvitationError(error: unknown, invitedEmail: string | null): string {
  const code = apiErrorCode(error);
  if (code === "INVITATION_EMAIL_MISMATCH") {
    return invitedEmail
      ? `Esta invitación es para ${invitedEmail}. Salí y entrá con ese email para activar la Beta.`
      : "Esta invitación es para otro email. Salí y entrá con el email invitado para activar la Beta.";
  }
  if (code === "DEMO_ALREADY_USED") return "Ya usaste la Beta con esta cuenta. Elegí un plan para seguir.";
  if (code === "INVITATION_INVALID") return INVITATION_INVALID_MESSAGE;
  if (error instanceof ApiError && error.status === 429) return error.message;
  return "No pudimos activar la Beta. Probá de nuevo en un rato.";
}
