import { useId, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { apiFieldErrors } from "../../api/errors";
import type { BillingProfile } from "../../api/types";
import { saveProfile } from "../../data/subscription";
import {
  normalizeProfile,
  serverProfileErrors,
  validateProfile,
  VAT_CONDITIONS,
  type ProfileErrors,
  type ProfileField,
} from "../../util/billingProfile";
import { billingErrorMessage } from "./billingLabels";

type ProfileFormProps = {
  initial: BillingProfile;
  submitLabel: string;
  cancelLabel?: string;
  onCancel: () => void;
  onSaved: (profile: BillingProfile) => void;
  onBusyChange?: (busy: boolean) => void;
};

type TextField = {
  field: Exclude<ProfileField, "vatCondition" | "country" | "taxIdType">;
  autoComplete: string;
  type?: "email" | "text";
  inputMode?: "numeric" | "email" | "text";
  help?: "cuit";
  half?: boolean;
};

const HEAD_FIELDS: TextField[] = [
  { field: "legalName", autoComplete: "organization" },
  { field: "taxId", autoComplete: "off", inputMode: "numeric", help: "cuit", half: true },
];

const TAIL_FIELDS: TextField[] = [
  { field: "addressLine", autoComplete: "street-address" },
  { field: "city", autoComplete: "address-level2", half: true },
  { field: "province", autoComplete: "address-level1", half: true },
  { field: "postalCode", autoComplete: "postal-code", half: true },
  {
    field: "billingEmail",
    autoComplete: "email",
    type: "email",
    inputMode: "email",
  },
];

export function ProfileForm({ initial, submitLabel, cancelLabel, onCancel, onSaved, onBusyChange }: ProfileFormProps) {
  const { t } = useTranslation("billing");
  const idPrefix = useId();
  const [profile, setProfile] = useState<BillingProfile>(initial);
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function update(field: ProfileField, value: string) {
    setProfile((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function setBusy(value: boolean) {
    setSaving(value);
    onBusyChange?.(value);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    const found = validateProfile(profile);
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length > 0) return;
    setBusy(true);
    try {
      const saved = await saveProfile(normalizeProfile(profile));
      setBusy(false);
      onSaved(saved);
    } catch (error) {
      const fields = serverProfileErrors(apiFieldErrors(error));
      setErrors(fields);
      setFormError(
        Object.keys(fields).length > 0
          ? t("profile.checkMarked")
          : billingErrorMessage(error, t("profile.saveFailed")),
      );
      setBusy(false);
    }
  }

  const inputId = (field: ProfileField) => `${idPrefix}-${field}`;
  const errorId = (field: ProfileField) => `${idPrefix}-${field}-error`;

  function renderField({ field, autoComplete, type = "text", inputMode, help, half }: TextField) {
    return (
      <div key={field} className={half ? "field billing-field-half" : "field"}>
        <label className="field-label" htmlFor={inputId(field)}>
          {t(`profile.fields.${field}`)}
        </label>
        <input
          id={inputId(field)}
          className="input"
          name={field}
          type={type}
          inputMode={inputMode}
          autoComplete={autoComplete}
          value={profile[field]}
          aria-invalid={errors[field] ? true : undefined}
          aria-describedby={errors[field] ? errorId(field) : undefined}
          onChange={(event) => update(field, event.target.value)}
        />
        {errors[field] ? (
          <span id={errorId(field)} className="field-error">
            {errors[field]}
          </span>
        ) : help ? (
          <span className="field-help">{t(`profile.help.${help}`)}</span>
        ) : null}
      </div>
    );
  }

  return (
    <form className="dialog-form billing-profile-form" onSubmit={(event) => void submit(event)} noValidate>
      {formError ? (
        <p className="form-error" role="alert">
          {formError}
        </p>
      ) : null}
      <div className="billing-profile-grid">
        {HEAD_FIELDS.map(renderField)}
        <div className="field billing-field-half">
          <label className="field-label" htmlFor={inputId("vatCondition")}>
            {t("profile.vatCondition")}
          </label>
          <select
            id={inputId("vatCondition")}
            className="select"
            name="vatCondition"
            value={profile.vatCondition}
            aria-invalid={errors.vatCondition ? true : undefined}
            aria-describedby={errors.vatCondition ? errorId("vatCondition") : undefined}
            onChange={(event) => update("vatCondition", event.target.value)}
          >
            <option value="">{t("profile.chooseOption")}</option>
            {VAT_CONDITIONS.map((condition) => (
              <option key={condition.value} value={condition.value}>
                {t(`vatConditions.${condition.value}`)}
              </option>
            ))}
          </select>
          {errors.vatCondition ? (
            <span id={errorId("vatCondition")} className="field-error">
              {errors.vatCondition}
            </span>
          ) : null}
        </div>
        {TAIL_FIELDS.map(renderField)}
      </div>
      <div className="dialog-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>
          {cancelLabel ?? t("cancel")}
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? t("profile.saving") : submitLabel}
        </button>
      </div>
    </form>
  );
}
