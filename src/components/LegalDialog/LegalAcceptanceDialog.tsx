import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import type { LegalDocument } from "../../api/types";
import { useAuth } from "../../context/auth";
import { acceptLegal, LEGAL_DOCUMENTS_KEY } from "../../data/billing";
import { useApiQuery } from "../../hooks/useApiQuery";
import { Dialog } from "../ui/Dialog";
import { pendingDocuments } from "./legalDocuments";
import "./LegalAcceptanceDialog.css";

export function LegalAcceptanceDialog() {
  const { t } = useTranslation("shell");
  const { pendingLegal, refreshUser, logout } = useAuth();
  const open = pendingLegal.length > 0;
  const documents = useApiQuery<LegalDocument[]>(open ? LEGAL_DOCUMENTS_KEY : null);
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const checkId = useId();

  if (!open) return null;

  const items = pendingDocuments(pendingLegal, documents.data);

  async function accept() {
    setSaving(true);
    setError(null);
    try {
      await acceptLegal(pendingLegal);
      await refreshUser();
      setChecked(false);
    } catch {
      setError(t("legal.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open
      title={t("legal.title")}
      description={t("legal.description")}
      busy
      onClose={() => undefined}
    >
      <ul className="legal-accept-list">
        {items.map((item) => (
          <li key={item.kind}>
            {item.path ? (
              <a href={item.path} target="_blank" rel="noopener noreferrer">
                {item.label}
              </a>
            ) : (
              <span>{item.label}</span>
            )}
            <span className="legal-accept-version">{t("legal.version", { version: item.version })}</span>
          </li>
        ))}
      </ul>
      <label className="legal-accept-check" htmlFor={checkId}>
        <input
          id={checkId}
          type="checkbox"
          checked={checked}
          disabled={saving}
          onChange={(event) => setChecked(event.target.checked)}
        />
        <span>{t("legal.check")}</span>
      </label>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="dialog-actions">
        <button type="button" className="btn btn-secondary" disabled={saving} onClick={logout}>
          {t("logout")}
        </button>
        <button type="button" className="btn btn-primary" disabled={!checked || saving} onClick={() => void accept()}>
          {saving ? t("legal.saving") : t("legal.accept")}
        </button>
      </div>
    </Dialog>
  );
}
