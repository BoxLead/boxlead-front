import { Fragment } from "react";
import { Trans, useTranslation } from "react-i18next";
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

const NAMED_DOCUMENTS = ["TERMS", "PRIVACY", "ADHESION_CONTRACT"] as const;

type NamedDocument = (typeof NAMED_DOCUMENTS)[number];

function isNamed(kind: LegalDocumentKind): kind is NamedDocument {
  return (NAMED_DOCUMENTS as readonly string[]).includes(kind);
}

function isAppPath(url: string): boolean {
  return /^\/(?![/\\])/.test(url);
}

function separator(index: number, total: number, and: string): string {
  if (index === 0) return "";
  return index === total - 1 ? ` ${and} ` : ", ";
}

export function LegalConsent({ state, documents, checked, disabled, onChange, onRetry }: LegalConsentProps) {
  const { t } = useTranslation("billing");
  if (state === "loading") {
    return <div className="skeleton checkout-consent-skeleton" aria-hidden="true" />;
  }
  if (state === "error") {
    return (
      <div className="checkout-consent-error" role="alert">
        <p>{t("legal.loadFailed")}</p>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}>
          {t("retry")}
        </button>
      </div>
    );
  }

  const required = checkoutLegal(documents);
  const linked = required
    .map(({ kind }) => documents.find((document) => document.kind === kind))
    .filter((document): document is LegalDocument => document !== undefined && isNamed(document.kind));
  const name = (kind: LegalDocumentKind) => (isNamed(kind) ? t(`legal.documents.${kind}`) : kind);

  return (
    <label className="checkout-consent">
      <input type="checkbox" name="acceptedLegal" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
      <span>
        {linked.length > 0 ? (
          <Trans
            t={t}
            i18nKey="legal.accept"
            components={{
              docs: (
                <>
                  {linked.map((document, index) => (
                    <Fragment key={document.kind}>
                      {separator(index, linked.length, t("legal.and"))}
                      {isAppPath(document.url) ? (
                        <a href={document.url} target="_blank" rel="noopener noreferrer">
                          {name(document.kind)}
                        </a>
                      ) : (
                        name(document.kind)
                      )}
                    </Fragment>
                  ))}
                </>
              ),
            }}
          />
        ) : (
          t("legal.acceptPayment")
        )}
      </span>
    </label>
  );
}
