export type AdminRole = "OWNER" | "FINANCE" | "SUPPORT";

export type SessionUser = {
  userId: string;
  email: string;
  name: string | null;
};

export type AdminMe = {
  userId: string;
  email: string;
  roles: AdminRole[];
  factorConfirmed: boolean;
  enrollmentOpenUntil: string | null;
  factorLockedUntil: string | null;
  adminSessionExpiresAt: string | null;
};

export type AdminPage<T> = {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
};

export type Money = {
  amountMinor: number;
  currency: string;
};

export type EnrollmentResponse = {
  otpauthUri: string;
};

export type AdminSessionResponse = {
  expiresAt: string;
};
