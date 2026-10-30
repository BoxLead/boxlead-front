import { describe, expect, it } from "vitest";
import { ApiError } from "../api/client";
import { acceptInvitationError, invitationInvalidMessage, readInvitationToken } from "./invitation";

describe("readInvitationToken", () => {
  it("reads the token from the fragment", () => {
    expect(readInvitationToken("#abc123")).toBe("abc123");
    expect(readInvitationToken("")).toBeNull();
    expect(readInvitationToken("#")).toBeNull();
  });
});

describe("acceptInvitationError", () => {
  const coded = (status: number, code: string) => new ApiError("x", status, { code });

  it("explains each error of the contract", () => {
    expect(acceptInvitationError(coded(403, "INVITATION_EMAIL_MISMATCH"), "ana@negocio.com")).toBe(
      "Esta invitación es para ana@negocio.com. Salí y entrá con ese email para activar la Beta.",
    );
    expect(acceptInvitationError(coded(409, "DEMO_ALREADY_USED"), null)).toBe(
      "Ya usaste la Beta con esta cuenta. Elegí un plan para seguir.",
    );
    expect(acceptInvitationError(coded(410, "INVITATION_INVALID"), null)).toBe(invitationInvalidMessage());
    expect(acceptInvitationError(coded(409, "DEMO_SUBSCRIPTION_ACTIVE"), null)).toBe(
      "Tu suscripción ya te da un plan, así que no hace falta la Beta. La invitación sigue abierta.",
    );
    expect(acceptInvitationError(coded(409, "DEMO_TEAM_MEMBER"), null)).toBe(
      "Tu cuenta es del equipo de BoxLead y ya tenés acceso, así que no necesitás la Beta. La invitación sigue abierta.",
    );
    expect(acceptInvitationError(new Error("network"), null)).toBe("No pudimos activar la Beta. Probá de nuevo en un rato.");
  });
});
