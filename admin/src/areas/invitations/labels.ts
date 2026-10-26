import type { TagTone } from "../../../../src/components/ui/Tag";
import type { DemoGrantStatus, InvitationStatus } from "./types";

export const INVITATION_STATUS: Record<InvitationStatus, { label: string; tone: TagTone }> = {
  OPEN: { label: "Abierta", tone: "accent" },
  ACCEPTED: { label: "Aceptada", tone: "success" },
  REVOKED: { label: "Revocada", tone: "neutral" },
  EXPIRED: { label: "Vencida", tone: "warning" },
};

export const DEMO_STATUS: Record<DemoGrantStatus, { label: string; tone: TagTone }> = {
  ACTIVE: { label: "Vigente", tone: "success" },
  ENDED: { label: "Terminada", tone: "warning" },
  REVOKED: { label: "Quitada", tone: "neutral" },
};
