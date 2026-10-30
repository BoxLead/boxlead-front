import i18next from "i18next";
import type { LegalDocument, LegalDocumentKind, LegalVersion } from "../../api/types";

function legalLabel(kind: LegalDocumentKind): string {
  return i18next.t(`legal.documents.${kind}`, { ns: "shell" });
}

const LEGAL_PATHS: Partial<Record<LegalDocumentKind, string>> = {
  TERMS: "/terminos",
  PRIVACY: "/privacidad",
  ADHESION_CONTRACT: "/contratos",
};

export type PendingDocument = LegalVersion & {
  label: string;
  path: string | null;
};

function isAppPath(url: string): boolean {
  return url.startsWith("/") && !url.startsWith("//") && !url.includes("\\");
}

export function pendingDocuments(pending: LegalVersion[], documents: LegalDocument[] | undefined): PendingDocument[] {
  return pending.map(({ kind, version }) => {
    const url = documents?.find((document) => document.kind === kind)?.url;
    return {
      kind,
      version,
      label: legalLabel(kind),
      path: url && isAppPath(url) ? url : (LEGAL_PATHS[kind] ?? null),
    };
  });
}
