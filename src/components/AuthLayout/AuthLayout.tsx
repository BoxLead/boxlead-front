import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useLocalizedPath } from "../../i18n/useLanguage";
import { LEGAL_ENTITY_NAME, PRODUCT_NAME } from "../../util/company";
import { AuthFrame } from "./AuthFrame";

export function AuthLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation("auth");
  const localized = useLocalizedPath();
  return (
    <AuthFrame
      homeLabel={t("layout.home", { product: PRODUCT_NAME })}
      homePath={localized("/")}
      legal={t("layout.legal", { product: PRODUCT_NAME, entity: LEGAL_ENTITY_NAME })}
    >
      {children}
    </AuthFrame>
  );
}
