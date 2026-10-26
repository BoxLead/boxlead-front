import type { AdminRole } from "../api/types";

export type Access = "ANY" | readonly AdminRole[];

export const ROLE_LABELS: Record<AdminRole, string> = {
  OWNER: "Dueño",
  FINANCE: "Finanzas",
  SUPPORT: "Soporte",
};

export function canAccess(roles: readonly AdminRole[], access: Access): boolean {
  if (roles.length === 0) return false;
  if (roles.includes("OWNER") || access === "ANY") return true;
  return access.some((role) => roles.includes(role));
}
