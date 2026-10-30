import { useTranslation } from "react-i18next";
import { LoadingIndicator } from "./LoadingIndicator";

export function Loading({ inline = false }: { inline?: boolean }) {
  const { t } = useTranslation();
  return <LoadingIndicator inline={inline} label={t("loading")} />;
}
