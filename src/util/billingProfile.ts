import type { BillingProfile, FieldError } from "../api/types";

export type ProfileField = keyof BillingProfile;
export type ProfileErrors = Partial<Record<ProfileField, string>>;

export const VAT_CONDITIONS = [
  { value: "RESPONSABLE_INSCRIPTO", label: "Responsable inscripto" },
  { value: "MONOTRIBUTO", label: "Monotributo" },
  { value: "EXENTO", label: "Exento" },
  { value: "CONSUMIDOR_FINAL", label: "Consumidor final" },
] as const;

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

export function cuitDigits(value: string): string {
  return value.replace(/[\s.-]/g, "");
}

export function isValidCuit(value: string): boolean {
  const digits = cuitDigits(value);
  if (!/^\d{11}$/.test(digits)) return false;
  const sum = CUIT_WEIGHTS.reduce((total, weight, index) => total + weight * Number(digits[index]), 0);
  const remainder = 11 - (sum % 11);
  const check = remainder === 11 ? 0 : remainder;
  return check !== 10 && check === Number(digits[10]);
}

export function formatCuit(value: string): string {
  const digits = cuitDigits(value);
  if (!/^\d{11}$/.test(digits)) return value;
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
}

export function vatConditionLabel(value: string): string {
  return VAT_CONDITIONS.find((condition) => condition.value === value)?.label ?? value;
}

export function isEmail(value: string): boolean {
  return EMAIL.test(value.trim());
}

export function validateProfile(profile: BillingProfile): ProfileErrors {
  const errors: ProfileErrors = {};
  for (const field of PROFILE_FIELDS) {
    if (!profile[field].trim()) errors[field] = "Completá este dato.";
  }
  if (!errors.taxId && profile.taxIdType === "CUIT" && !isValidCuit(profile.taxId)) {
    errors.taxId = "Revisá el CUIT, el dígito verificador no coincide.";
  }
  if (!errors.billingEmail && !isEmail(profile.billingEmail)) {
    errors.billingEmail = "Escribí un email válido.";
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

const SERVER_MESSAGES: Partial<Record<ProfileField, string>> = {
  taxId: "Revisá el CUIT, el dígito verificador no coincide.",
  billingEmail: "Escribí un email válido.",
};

export function serverProfileErrors(fields: FieldError[]): ProfileErrors {
  const errors: ProfileErrors = {};
  for (const { field } of fields) {
    if (isProfileField(field) && !errors[field]) errors[field] = SERVER_MESSAGES[field] ?? "Revisá este dato.";
  }
  return errors;
}
