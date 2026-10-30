import i18next from "i18next";
import type { BillingProfile, FieldError } from "../api/types";
import { cuitDigits } from "./taxId";

export { cuitDigits, formatCuit, VAT_CONDITIONS, vatConditionLabel } from "./taxId";

export type ProfileField = keyof BillingProfile;
export type ProfileErrors = Partial<Record<ProfileField, string>>;

export const PROFILE_FIELDS: readonly ProfileField[] = [
  "country",
  "taxIdType",
  "taxId",
  "legalName",
  "vatCondition",
  "addressLine",
  "city",
  "province",
  "postalCode",
  "billingEmail",
];

const CUIT_WEIGHTS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emptyProfile(billingEmail = ""): BillingProfile {
  return {
    country: "AR",
    taxIdType: "CUIT",
    taxId: "",
    legalName: "",
    vatCondition: "",
    addressLine: "",
    city: "",
    province: "",
    postalCode: "",
    billingEmail,
  };
}

export function isValidCuit(value: string): boolean {
  const digits = cuitDigits(value);
  if (!/^\d{11}$/.test(digits)) return false;
  const sum = CUIT_WEIGHTS.reduce((total, weight, index) => total + weight * Number(digits[index]), 0);
  const remainder = 11 - (sum % 11);
  const check = remainder === 11 ? 0 : remainder;
  return check !== 10 && check === Number(digits[10]);
}

export function isEmail(value: string): boolean {
  return EMAIL.test(value.trim());
}

export function validateProfile(profile: BillingProfile): ProfileErrors {
  const errors: ProfileErrors = {};
  for (const field of PROFILE_FIELDS) {
    if (!profile[field].trim()) errors[field] = i18next.t("profile.errors.required", { ns: "billing" });
  }
  if (!errors.taxId && profile.taxIdType === "CUIT" && !isValidCuit(profile.taxId)) {
    errors.taxId = i18next.t("profile.errors.cuit", { ns: "billing" });
  }
  if (!errors.billingEmail && !isEmail(profile.billingEmail)) {
    errors.billingEmail = i18next.t("profile.errors.email", { ns: "billing" });
  }
  return errors;
}

export function normalizeProfile(profile: BillingProfile): BillingProfile {
  const trimmed = Object.fromEntries(PROFILE_FIELDS.map((field) => [field, profile[field].trim()])) as BillingProfile;
  return trimmed.taxIdType === "CUIT" ? { ...trimmed, taxId: cuitDigits(trimmed.taxId) } : trimmed;
}

function isProfileField(value: string): value is ProfileField {
  return PROFILE_FIELDS.some((field) => field === value);
}

function serverMessage(field: ProfileField): string {
  if (field === "taxId") return i18next.t("profile.errors.cuit", { ns: "billing" });
  if (field === "billingEmail") return i18next.t("profile.errors.email", { ns: "billing" });
  return i18next.t("profile.errors.invalid", { ns: "billing" });
}

export function serverProfileErrors(fields: FieldError[]): ProfileErrors {
  const errors: ProfileErrors = {};
  for (const { field } of fields) {
    if (isProfileField(field) && !errors[field]) errors[field] = serverMessage(field);
  }
  return errors;
}
