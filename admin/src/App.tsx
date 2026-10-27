import { lazy, Suspense, type ReactNode } from "react";
import { Route, Routes } from "react-router-dom";
import { Loading } from "../../src/components/Loading";
import { ToastProvider } from "../../src/components/ui/ToastProvider";
import { CodeScreen } from "./entry/CodeScreen";
import { ConnectionLost } from "./entry/ConnectionLost";
import { EnrollScreen } from "./entry/EnrollScreen";
import { LoginScreen } from "./entry/LoginScreen";
import { ReauthDialog } from "./entry/ReauthDialog";
import { EnrollmentClosedScreen, FailedScreen, NoAccessScreen } from "./entry/StatusScreens";
import { AdminLayout } from "./layout/AdminLayout";
import { ForbiddenScreen, NotFoundScreen } from "./layout/MissingScreens";
import { ROUTES } from "./routes";
import { ResellerDirectoryProvider } from "./session/ResellerDirectoryProvider";
import { canAccess, type Access } from "./session/roles";
import { useAdmin, useSession } from "./session/session";

const GalleryScreen = import.meta.env.DEV ? lazy(() => import("./dev/Gallery").then((module) => ({ default: module.GalleryScreen }))) : null;

function Gate({ access, children }: { access: Access; children: ReactNode }) {
  const me = useAdmin();
  if (!canAccess(me.roles, access)) return <ForbiddenScreen />;
  return <Suspense fallback={<Loading inline />}>{children}</Suspense>;
}

function AdminRoutes() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        {ROUTES.map(({ path, access, Screen }) => (
          <Route
            key={path}
            path={path}
            element={
              <Gate access={access}>
                <Screen />
              </Gate>
            }
          />
        ))}
        {GalleryScreen ? (
          <Route
            path="/__ui"
            element={
              <Suspense fallback={<Loading inline />}>
                <GalleryScreen />
              </Suspense>
            }
          />
        ) : null}
        <Route path="*" element={<NotFoundScreen />} />
      </Route>
    </Routes>
  );
}

function Stage() {
  const { stage } = useSession();
  switch (stage.kind) {
    case "checking":
      return <Loading />;
    case "failed":
      return <FailedScreen />;
    case "signed-out":
      return <LoginScreen notice={stage.notice} />;
    case "no-access":
      return <NoAccessScreen email={stage.email} />;
    case "enroll":
      return <EnrollScreen me={stage.me} />;
    case "enrollment-closed":
      return <EnrollmentClosedScreen />;
    case "code":
      return <CodeScreen me={stage.me} enrolled={stage.enrolled} />;
    case "ready":
      return (
        <ResellerDirectoryProvider>
          <AdminRoutes />
          <ReauthDialog />
        </ResellerDirectoryProvider>
      );
  }
}

export default function App() {
  return (
    <ToastProvider>
      <Stage />
      <ConnectionLost />
    </ToastProvider>
  );
}
