import { Suspense, useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { dismissPlanError } from "../../data/planErrors";
import { Loading } from "../Loading";
import { PlanBanner } from "../PlanBanner/PlanBanner";
import { Sidebar } from "../Sidebar/Sidebar";
import "./Layout.css";

export function Layout() {
  const { pathname } = useLocation();
  const contentRef = useRef<HTMLElement>(null);

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: "instant" });
    dismissPlanError();
  }, [pathname]);

  return (
    <div className="layout">
      <Sidebar />
      <main className="layout-content" ref={contentRef}>
        <PlanBanner />
        <Suspense fallback={<Loading inline />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
