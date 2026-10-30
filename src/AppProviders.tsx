import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Analytics } from "./analytics/Analytics";
import { ToastProvider } from "./components/ui/ToastProvider";
import { AuthProvider } from "./context/AuthContext";
import { LanguageSync } from "./i18n/LanguageSync";
import { SocialAuthProvider } from "./context/SocialAuthProvider";
import { RouteMeta } from "./seo/RouteMeta";
import App from "./App.tsx";

function Toasts({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation("common", { bindI18n: "languageChanged loaded" });
  return <ToastProvider closeLabel={i18n.t("closeNotice", { ns: "shell" })}>{children}</ToastProvider>;
}

export function AppProviders() {
  return (
    <SocialAuthProvider>
      <LanguageSync />
      <RouteMeta />
      <AuthProvider>
        <Toasts>
          <App />
          <Analytics />
        </Toasts>
      </AuthProvider>
    </SocialAuthProvider>
  );
}
