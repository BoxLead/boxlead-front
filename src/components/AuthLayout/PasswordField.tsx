import { useTranslation } from "react-i18next";
import { PasswordInput, type PasswordInputProps } from "./PasswordInput";

type PasswordFieldProps = Omit<PasswordInputProps, "label" | "showLabel" | "hideLabel"> & { label?: string };

export function PasswordField({ label, ...props }: PasswordFieldProps) {
  const { t } = useTranslation("auth");
  return <PasswordInput {...props} label={label ?? t("password.label")} showLabel={t("password.show")} hideLabel={t("password.hide")} />;
}
