import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ToastProvider } from "./components/ui/ToastProvider";
import { AuthProvider } from "./context/AuthContext";
import { SocialAuthProvider } from "./context/SocialAuthProvider";
import "@fontsource-variable/inter";
import "./index.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <SocialAuthProvider>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </SocialAuthProvider>,
);
