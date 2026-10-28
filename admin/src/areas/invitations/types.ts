import type { PlanSource } from "../../status";

export type InvitationStatus = "OPEN" | "ACCEPTED" | "REVOKED" | "EXPIRED";

export type DemoGrantStatus = "ACTIVE" | "ENDED" | "REVOKED";

export type Invitation = {
  id: string;
  email: string;
  status: InvitationStatus;
  demoDays: number;
  expiresAt: string;
  resellerId: string | null;
  createdBy: string;
  createdAt: string;
  acceptedAt: string | null;
  acceptedUserId: string | null;
  revokedAt: string | null;
};

export type DemoGrant = {
  id: string;
  userId: string;
  email: string | null;
  invitationId: string | null;
  status: DemoGrantStatus;
  startsAt: string;
  endsAt: string;
  revokedAt: string | null;
};

export type NewInvitation = {
  email: string;
  expiresAt: string;
  demoDays: number | null;
  resellerId: string | null;
};

export type CreatedInvitation = {
  id: string;
  link: string | null;
};

export type CustomerMatch = {
  id: string;
  email: string;
  name: string | null;
  legalName: string | null;
  createdAt: string;
  planCode: string | null;
  planSource: PlanSource;
  subscriptionStatus: string | null;
};

export const MAX_DEMO_DAYS = 365;
export const MAX_EMAIL_LENGTH = 254;

export function userLabel(grant: DemoGrant): string {
  return grant.email ?? grant.userId;
}
