import { Suspense, useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/auth";
import { dismissPlanError } from "../../data/planErrors";
import { EmailVerificationGate } from "../EmailVerificationGate/EmailVerificationGate";
import { LegalAcceptanceDialog } from "../LegalDialog/LegalAcceptanceDialog";
import { Loading } from "../Loading";
import { NotificationWatcher } from "../Notifications/NotificationWatcher";
import { PlanBanner } from "../PlanBanner/PlanBanner";
import { Sidebar } from "../Sidebar/Sidebar";
import "./Layout.css";

const ACCOUNT_PATH = "/app/cuenta";

export function Layout() {
  const { pathname } = useLocation();
  const contentRef = useRef<HTMLElement>(null);
  const { user } = useAuth();
  const gated = user?.emailVerificationPending === true && !pathname.startsWith(ACCOUNT_PATH);

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: "instant" });
    dismissPlanError();
  }, [pathname]);

  return (
    <div className="layout">
      <Sidebar />
      <main className="layout-content" ref={contentRef}>
        <PlanBanner />
        {gated ? (
          <EmailVerificationGate />
        ) : (
          <Suspense fallback={<Loading inline />}>
            <Outlet />
          </Suspense>
        )}
      </main>
      <LegalAcceptanceDialog />
      <NotificationWatcher />
    </div>
  );
}
