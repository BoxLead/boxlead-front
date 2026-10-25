import { Fragment } from "react";
import type { LegalDocument, LegalDocumentKind } from "../../api/types";
import { checkoutLegal } from "../../util/checkout";

type LegalConsentProps = {
  state: "loading" | "error" | "ready";
  documents: LegalDocument[];
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
  onRetry: () => void;
};

const DOCUMENT_NAMES: Partial<Record<LegalDocumentKind, string>> = {
  TERMS: "los Términos y condiciones",
  PRIVACY: "la Política de privacidad",
  ADHESION_CONTRACT: "el Contrato de adhesión",
};

function isAppPath(url: string): boolean {
  return /^\/(?![/\\])/.test(url);
}

function separator(index: number, total: number): string {
  if (index === 0) return "";
  return index === total - 1 ? " y " : ", ";
}

export function LegalConsent({ state, documents, checked, disabled, onChange, onRetry }: LegalConsentProps) {
  if (state === "loading") {
    return <div className="skeleton checkout-consent-skeleton" aria-hidden="true" />;
  }
  if (state === "error") {
    return (
      <div className="checkout-consent-error" role="alert">
        <p>No pudimos cargar los términos vigentes.</p>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}>
          Reintentar
        </button>
      </div>
    );
  }

  const required = checkoutLegal(documents);
  const linked = required
    .map(({ kind }) => documents.find((document) => document.kind === kind))
    .filter((document): document is LegalDocument => document !== undefined && DOCUMENT_NAMES[document.kind] !== undefined);

  return (
    <label className="checkout-consent">
      <input type="checkbox" name="acceptedLegal" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
      <span>
        {linked.length > 0 ? (
          <>
            Leí y acepto{" "}
            {linked.map((document, index) => (
              <Fragment key={document.kind}>
                {separator(index, linked.length)}
                {isAppPath(document.url) ? (
                  <a href={document.url} target="_blank" rel="noopener noreferrer">
                    {DOCUMENT_NAMES[document.kind]}
                  </a>
                ) : (
                  DOCUMENT_NAMES[document.kind]
                )}
              </Fragment>
            ))}{" "}
            de BoxLead, y que el pago lo procesa Mercado Pago según sus términos.
          </>
        ) : (
          "Acepto que el pago lo procesa Mercado Pago según sus términos."
        )}
      </span>
    </label>
  );
}
