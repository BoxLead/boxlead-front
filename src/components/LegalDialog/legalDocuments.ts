import type { LegalDocument, LegalDocumentKind, LegalVersion } from "../../api/types";

export const LEGAL_LABELS: Record<LegalDocumentKind, string> = {
  TERMS: "Términos y condiciones",
  PRIVACY: "Política de privacidad",
  ADHESION_CONTRACT: "Contrato de adhesión",
  RESELLER_AGREEMENT: "Acuerdo de revendedores",
  DATA_PROCESSING: "Acuerdo de tratamiento de datos",
};

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
      label: LEGAL_LABELS[kind],
      path: url && isAppPath(url) ? url : (LEGAL_PATHS[kind] ?? null),
    };
  });
}
