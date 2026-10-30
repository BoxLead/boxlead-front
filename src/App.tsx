import { Suspense, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { FeatureRoute } from "./components/FeatureRoute";
import { Loading } from "./components/Loading";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { preloadSocialAuth } from "./context/socialRoutes";
import { messages } from "./i18n";
import { EDITORIAL_PATHS } from "./landing/editorialPaths";
import {
  lazyRoute,
  NotFound,
  registerRoutePreload,
  RouteAnnouncer,
  RouteErrorBoundary,
  ScrollRestoration,
} from "./routing";

const LandingPage = lazyRoute(() => import("./landing/LandingPage"), "LandingPage");
const EditorialPage = lazyRoute(() => import("./landing/pages/EditorialPage"), "EditorialPage");
const Layout = lazyRoute(() => import("./components/Layout/Layout"), "Layout");
const Connections = lazyRoute(() => import("./pages/Connections/Connections"), "Connections");
const Inbox = lazyRoute(() => import("./pages/Inbox/Inbox"), "Inbox");
const LeadDetail = lazyRoute(() => import("./pages/LeadDetail/LeadDetail"), "LeadDetail");
const Categories = lazyRoute(() => import("./pages/Categories/Categories"), "Categories");
const Agents = lazyRoute(() => import("./pages/Agents/Agents"), "Agents");
const Metrics = lazyRoute(() => import("./pages/Metrics/Metrics"), "Metrics");
const Leads = lazyRoute(() => import("./pages/Leads/Leads"), "Leads");
const Login = lazyRoute(() => import("./pages/Login/Login"), "Login");
const OAuthCallback = lazyRoute(() => import("./pages/OAuthCallback/OAuthCallback"), "OAuthCallback");
const SocialCallback = lazyRoute(() => import("./pages/SocialCallback/SocialCallback"), "SocialCallback");
const DataDeletion = lazyRoute(() => import("./pages/Legal/DataDeletion"), "DataDeletion");
const PrivacyPolicy = lazyRoute(() => import("./pages/Legal/PrivacyPolicy"), "PrivacyPolicy");
const TermsOfService = lazyRoute(() => import("./pages/Legal/TermsOfService"), "TermsOfService");
const Register = lazyRoute(() => import("./pages/Register/Register"), "Register");
const Billing = lazyRoute(() => import("./pages/Billing/Billing"), "Billing");
const BillingReturn = lazyRoute(() => import("./pages/Billing/BillingReturn"), "BillingReturn");
const Reseller = lazyRoute(() => import("./pages/Reseller/Reseller"), "Reseller");
const Invitation = lazyRoute(() => import("./pages/Invitation/Invitation"), "Invitation");
const Terms = lazyRoute(() => import("./pages/Legal/Terms"), "Terms");
const Privacy = lazyRoute(() => import("./pages/Legal/Privacy"), "Privacy");
const AdhesionContracts = lazyRoute(() => import("./pages/Legal/AdhesionContracts"), "AdhesionContracts");
const Withdrawal = lazyRoute(() => import("./pages/ConsumerRequest/Withdrawal"), "Withdrawal");
const Cancellation = lazyRoute(() => import("./pages/ConsumerRequest/Cancellation"), "Cancellation");
const ForgotPassword = lazyRoute(() => import("./pages/PasswordRecovery/ForgotPassword"), "ForgotPassword");
const ResetPassword = lazyRoute(() => import("./pages/PasswordRecovery/ResetPassword"), "ResetPassword");
const ConfirmEmail = lazyRoute(() => import("./pages/EmailVerification/ConfirmEmail"), "ConfirmEmail");
const ConfirmEmailChange = lazyRoute(() => import("./pages/EmailChange/ConfirmEmailChange"), "ConfirmEmailChange");
const Reauthenticate = lazyRoute(() => import("./pages/Reauthenticate/Reauthenticate"), "Reauthenticate");
const Account = lazyRoute(() => import("./pages/Account/Account"), "Account");
const Notifications = lazyRoute(() => import("./pages/Notifications/Notifications"), "Notifications");
const NotificationUnsubscribe = lazyRoute(() => import("./pages/NotificationUnsubscribe/NotificationUnsubscribe"), "NotificationUnsubscribe");
const DesignSystem = import.meta.env.DEV ? lazyRoute(() => import("./pages/DesignSystem/DesignSystem"), "DesignSystem") : null;

registerRoutePreload("/", [LandingPage]);
registerRoutePreload("/en", [LandingPage]);
for (const path of EDITORIAL_PATHS) {
  registerRoutePreload(path, [EditorialPage]);
  registerRoutePreload(`/en${path}`, [EditorialPage]);
}
const socialAuth = { preload: preloadSocialAuth };
registerRoutePreload("/login", [Login, socialAuth]);
registerRoutePreload("/register", [Register, socialAuth]);
registerRoutePreload("/recuperar-clave", [ForgotPassword]);
registerRoutePreload("/nueva-clave", [ResetPassword]);
registerRoutePreload("/confirmar-email", [ConfirmEmail]);
registerRoutePreload("/nuevo-email", [ConfirmEmailChange]);
registerRoutePreload("/reingresar", [Reauthenticate, socialAuth]);
const appMessages = ["shell", "inbox", "leads", "metrics", "billing", "agents", "account", "connections"].map(messages);
registerRoutePreload("/app/cuenta", [Layout, Account, ...appMessages]);
registerRoutePreload("/app", [Layout, Inbox, ...appMessages]);
registerRoutePreload("/app/inbox", [Layout, Inbox, ...appMessages]);
registerRoutePreload("/app/leads", [Layout, Leads, LeadDetail, ...appMessages]);
registerRoutePreload("/app/metrics", [Layout, Metrics, ...appMessages]);
registerRoutePreload("/app/categories", [Layout, Categories, ...appMessages]);
registerRoutePreload("/app/agents", [Layout, Agents, ...appMessages]);
registerRoutePreload("/app/connections", [Layout, Connections, ...appMessages]);
registerRoutePreload("/app/billing", [Layout, Billing, ...appMessages]);
registerRoutePreload("/app/reseller", [Layout, Reseller, ...appMessages]);
registerRoutePreload("/app/notificaciones", [Layout, Notifications, ...appMessages]);
registerRoutePreload("/avisos/baja", [NotificationUnsubscribe]);

function Page({ children }: { children: ReactNode }) {
  return <RouteErrorBoundary inline>{children}</RouteErrorBoundary>;
}

export default function App() {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<Loading />}>
        <ScrollRestoration />
        <RouteAnnouncer />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/en" element={<LandingPage />} />
          {EDITORIAL_PATHS.map((path) => (
            <Route path={path} element={<EditorialPage />} key={path} />
          ))}
          {EDITORIAL_PATHS.map((path) => (
            <Route path={`/en${path}`} element={<EditorialPage />} key={`/en${path}`} />
          ))}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/social/callback" element={<SocialCallback />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/data-deletion" element={<DataDeletion />} />
          <Route path="/invitacion" element={<Invitation />} />
          <Route path="/terminos" element={<Terms />} />
          <Route path="/privacidad" element={<Privacy />} />
          <Route path="/contratos" element={<AdhesionContracts />} />
          <Route path="/arrepentimiento" element={<Withdrawal />} />
          <Route path="/baja" element={<Cancellation />} />
          <Route path="/recuperar-clave" element={<ForgotPassword />} />
          <Route path="/nueva-clave" element={<ResetPassword />} />
          <Route path="/confirmar-email" element={<ConfirmEmail />} />
          <Route path="/nuevo-email" element={<ConfirmEmailChange />} />
          <Route path="/reingresar" element={<Reauthenticate />} />
          <Route path="/avisos/baja" element={<NotificationUnsubscribe />} />
          <Route element={<ProtectedRoute />}>
            <Route
              path="/app/oauth/callback/:platform"
              element={<OAuthCallback />}
            />
            <Route path="/app" element={<Layout />}>
              <Route index element={<Navigate to="/app/inbox" replace />} />
              <Route path="inbox" element={<Page><Inbox /></Page>} />
              <Route path="leads" element={<Page><Leads /></Page>} />
              <Route path="leads/:leadId" element={<Page><LeadDetail /></Page>} />
              <Route path="metrics" element={<Page><Metrics /></Page>} />
              <Route path="categories" element={<Page><Categories /></Page>} />
              <Route path="agents" element={<Page><Agents /></Page>} />
              <Route path="connections" element={<Page><Connections /></Page>} />
              <Route path="notificaciones" element={<Page><Notifications /></Page>} />
              <Route element={<FeatureRoute feature="billing" />}>
                <Route path="billing" element={<Billing />} />
                <Route path="billing/return" element={<BillingReturn />} />
              </Route>
              <Route element={<FeatureRoute feature="reseller" />}>
                <Route path="reseller" element={<Reseller />} />
              </Route>
              <Route element={<FeatureRoute feature="account" />}>
                <Route path="cuenta" element={<Page><Account /></Page>} />
              </Route>
              <Route path="*" element={<NotFound inApp />} />
            </Route>
          </Route>
          {DesignSystem ? <Route path="/__ui" element={<DesignSystem />} /> : null}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </RouteErrorBoundary>
  );
}
