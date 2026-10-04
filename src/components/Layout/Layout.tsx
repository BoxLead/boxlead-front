import { Suspense, useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Loading } from "../Loading";
import { Sidebar } from "../Sidebar/Sidebar";
import "./Layout.css";

export function Layout() {
  const { pathname } = useLocation();
  const contentRef = useRef<HTMLElement>(null);

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);

  return (
    <div className="layout">
      <Sidebar />
      <main className="layout-content" ref={contentRef}>
        <Suspense fallback={<Loading inline />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
