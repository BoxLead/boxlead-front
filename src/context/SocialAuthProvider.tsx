import { lazy, Suspense, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Loading } from "../components/Loading";
import {
  SOCIAL_AUTH_CLIENT_ID,
  SOCIAL_AUTH_DOMAIN,
  SOCIAL_AUTH_ENABLED,
  SOCIAL_CALLBACK_PATH,
} from "../util/social";
import { needsSocialAuth } from "./socialRoutes";

const Auth0Boundary = lazy(() => import("./Auth0Boundary"));

export function SocialAuthProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [active, setActive] = useState(() => needsSocialAuth(pathname, SOCIAL_CALLBACK_PATH));
  if (!active && needsSocialAuth(pathname, SOCIAL_CALLBACK_PATH)) setActive(true);

  if (!SOCIAL_AUTH_ENABLED || !SOCIAL_AUTH_DOMAIN || !SOCIAL_AUTH_CLIENT_ID || !active) {
    return children;
  }

  return (
    <Suspense fallback={<Loading />}>
      <Auth0Boundary domain={SOCIAL_AUTH_DOMAIN} clientId={SOCIAL_AUTH_CLIENT_ID}>
        {children}
      </Auth0Boundary>
    </Suspense>
  );
}
