import { Analytics } from "./analytics/Analytics";
import { ToastProvider } from "./components/ui/ToastProvider";
import { AuthProvider } from "./context/AuthContext";
import { SocialAuthProvider } from "./context/SocialAuthProvider";
import { RouteMeta } from "./seo/RouteMeta";
import App from "./App.tsx";

export function AppProviders() {
  return (
    <SocialAuthProvider>
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
