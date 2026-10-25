import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { FeatureRoute } from "./components/FeatureRoute";
import { Loading } from "./components/Loading";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ScrollToTop } from "./components/ScrollToTop";
import { LandingPage } from "./landing/LandingPage";

const Layout = lazy(() =>
  import("./components/Layout/Layout").then((m) => ({ default: m.Layout })),
);
const Connections = lazy(() =>
  import("./pages/Connections/Connections").then((m) => ({
    default: m.Connections,
  })),
);
const Inbox = lazy(() =>
  import("./pages/Inbox/Inbox").then((m) => ({ default: m.Inbox })),
);
const LeadDetail = lazy(() =>
  import("./pages/LeadDetail/LeadDetail").then((m) => ({
    default: m.LeadDetail,
  })),
);
const Categories = lazy(() =>
  import("./pages/Categories/Categories").then((m) => ({
    default: m.Categories,
  })),
);
const Agents = lazy(() =>
  import("./pages/Agents/Agents").then((m) => ({ default: m.Agents })),
);
const Metrics = lazy(() =>
  import("./pages/Metrics/Metrics").then((m) => ({ default: m.Metrics })),
);
const Leads = lazy(() =>
  import("./pages/Leads/Leads").then((m) => ({ default: m.Leads })),
);
const Login = lazy(() =>
  import("./pages/Login/Login").then((m) => ({ default: m.Login })),
);
const OAuthCallback = lazy(() =>
  import("./pages/OAuthCallback/OAuthCallback").then((m) => ({
    default: m.OAuthCallback,
  })),
);
const SocialCallback = lazy(() =>
  import("./pages/SocialCallback/SocialCallback").then((m) => ({
    default: m.SocialCallback,
  })),
);
const DataDeletion = lazy(() =>
  import("./pages/Legal/DataDeletion").then((m) => ({
    default: m.DataDeletion,
  })),
);
const PrivacyPolicy = lazy(() =>
  import("./pages/Legal/PrivacyPolicy").then((m) => ({
    default: m.PrivacyPolicy,
  })),
);
const TermsOfService = lazy(() =>
  import("./pages/Legal/TermsOfService").then((m) => ({
    default: m.TermsOfService,
  })),
);
const Register = lazy(() =>
  import("./pages/Register/Register").then((m) => ({ default: m.Register })),
);
const Billing = lazy(() =>
  import("./pages/Billing/Billing").then((m) => ({ default: m.Billing })),
);
const BillingReturn = lazy(() =>
  import("./pages/Billing/BillingReturn").then((m) => ({
    default: m.BillingReturn,
  })),
);
const Reseller = lazy(() =>
  import("./pages/Reseller/Reseller").then((m) => ({ default: m.Reseller })),
);
const Invitation = lazy(() =>
  import("./pages/Invitation/Invitation").then((m) => ({
    default: m.Invitation,
  })),
);
const Terms = lazy(() =>
  import("./pages/Legal/Terms").then((m) => ({ default: m.Terms })),
);
const Privacy = lazy(() =>
  import("./pages/Legal/Privacy").then((m) => ({ default: m.Privacy })),
);
const AdhesionContracts = lazy(() =>
  import("./pages/Legal/AdhesionContracts").then((m) => ({
    default: m.AdhesionContracts,
  })),
);
const Withdrawal = lazy(() =>
  import("./pages/ConsumerRequest/Withdrawal").then((m) => ({
    default: m.Withdrawal,
  })),
);
const Cancellation = lazy(() =>
  import("./pages/ConsumerRequest/Cancellation").then((m) => ({
    default: m.Cancellation,
  })),
);

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <ScrollToTop />
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
            <Route path="inbox" element={<Inbox />} />
            <Route path="leads" element={<Leads />} />
            <Route path="leads/:leadId" element={<LeadDetail />} />
            <Route path="metrics" element={<Metrics />} />
            <Route path="categories" element={<Categories />} />
            <Route path="agents" element={<Agents />} />
            <Route path="connections" element={<Connections />} />
            <Route element={<FeatureRoute feature="billing" />}>
              <Route path="billing" element={<Billing />} />
              <Route path="billing/return" element={<BillingReturn />} />
            </Route>
            <Route element={<FeatureRoute feature="reseller" />}>
              <Route path="reseller" element={<Reseller />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
