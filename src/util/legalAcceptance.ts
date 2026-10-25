import type { LegalDocumentKind, LegalVersion } from "../api/types";

export const SIGNUP_LEGAL_KINDS: readonly LegalDocumentKind[] = ["TERMS", "PRIVACY"];

export type SignupLegal = {
  versions: LegalVersion[];
  termsUrl: string;
  privacyUrl: string;
};

type Document = LegalVersion & { url: string; requiresAcceptance: boolean };

function isSignupKind(value: unknown): value is LegalDocumentKind {
  return SIGNUP_LEGAL_KINDS.some((kind) => kind === value);
}

function isInternalPath(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\");
}

function readDocument(item: unknown): Document | null {
  if (typeof item !== "object" || item === null) return null;
  if (!("kind" in item) || !("version" in item) || !("url" in item)) return null;
  const { kind, version, url } = item;
  if (!isSignupKind(kind) || typeof version !== "string" || !isInternalPath(url)) return null;
  const requiresAcceptance = "requiresAcceptance" in item && item.requiresAcceptance === true;
  return { kind, version, url, requiresAcceptance };
}

export function signupLegal(value: unknown): SignupLegal | null {
  if (!Array.isArray(value)) return null;
  const documents = value.map(readDocument).filter((item): item is Document => item !== null);
  const terms = documents.find((item) => item.kind === "TERMS");
  const privacy = documents.find((item) => item.kind === "PRIVACY");
  if (!terms || !privacy) return null;
  return {
    versions: [terms, privacy]
      .filter((item) => item.requiresAcceptance)
      .map(({ kind, version }) => ({ kind, version })),
    termsUrl: terms.url,
    privacyUrl: privacy.url,
  };
}

export function readAcceptedLegal(value: unknown): LegalVersion[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const versions: LegalVersion[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null || !("kind" in item) || !("version" in item)) continue;
    const { kind, version } = item;
    if (isSignupKind(kind) && typeof version === "string" && version) versions.push({ kind, version });
  }
  return versions.length > 0 ? versions : undefined;
}
