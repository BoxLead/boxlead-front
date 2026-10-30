import { useTranslation } from "react-i18next";

export function Loading({ inline = false }: { inline?: boolean }) {
  const { t } = useTranslation();
  return (
    <div
      className={`app-loading${inline ? " app-loading-inline" : ""}`}
      role="status"
    >
      <span className="spinner" />
      <span className="visually-hidden">{t("loading")}</span>
    </div>
  );
}
