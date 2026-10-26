import { Suspense, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { FeatureRoute } from "./components/FeatureRoute";
import { Loading } from "./components/Loading";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { preloadSocialAuth } from "./context/socialRoutes";
import {
  lazyRoute,
  NotFound,
  preloadOnIdle,
  registerRoutePreload,
  RouteAnnouncer,
  RouteErrorBoundary,
  ScrollRestoration,
} from "./routing";

const LandingPage = lazyRoute(() => import("./landing/LandingPage"), "LandingPage");
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

registerRoutePreload("/", [LandingPage]);
const socialAuth = { preload: preloadSocialAuth };
registerRoutePreload("/login", [Login, socialAuth]);
registerRoutePreload("/register", [Register, socialAuth]);
registerRoutePreload("/app", [Layout, Inbox]);
registerRoutePreload("/app/inbox", [Layout, Inbox]);
registerRoutePreload("/app/leads", [Layout, Leads, LeadDetail]);
registerRoutePreload("/app/metrics", [Layout, Metrics]);
registerRoutePreload("/app/categories", [Layout, Categories]);
registerRoutePreload("/app/agents", [Layout, Agents]);
registerRoutePreload("/app/connections", [Layout, Connections]);
registerRoutePreload("/app/billing", [Layout, Billing]);
registerRoutePreload("/app/reseller", [Layout, Reseller]);
preloadOnIdle(window.location.pathname);

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
              <Route element={<FeatureRoute feature="billing" />}>
                <Route path="billing" element={<Billing />} />
                <Route path="billing/return" element={<BillingReturn />} />
              </Route>
              <Route element={<FeatureRoute feature="reseller" />}>
                <Route path="reseller" element={<Reseller />} />
              </Route>
              <Route path="*" element={<NotFound inApp />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </RouteErrorBoundary>
  );
}
