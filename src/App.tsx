import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
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

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
        <Route path="/data-deletion" element={<DataDeletion />} />
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
            <Route path="categories" element={<Categories />} />
            <Route path="connections" element={<Connections />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
