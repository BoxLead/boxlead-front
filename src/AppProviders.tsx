import { Analytics } from "./analytics/Analytics";
import { ToastProvider } from "./components/ui/ToastProvider";
import { AuthProvider } from "./context/AuthContext";
import { LanguageSync } from "./i18n/LanguageSync";
import { SocialAuthProvider } from "./context/SocialAuthProvider";
import { RouteMeta } from "./seo/RouteMeta";
import App from "./App.tsx";

export function AppProviders() {
  return (
    <SocialAuthProvider>
      <LanguageSync />
      <RouteMeta />
      <AuthProvider>
        <ToastProvider>
          <App />
          <Analytics />
        </ToastProvider>
      </AuthProvider>
    </SocialAuthProvider>
  );
}
