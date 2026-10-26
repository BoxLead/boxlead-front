import type { ReactNode } from "react";
import { Auth0Provider } from "@auth0/auth0-react";

type Auth0BoundaryProps = {
  domain: string;
  clientId: string;
  children: ReactNode;
};

export default function Auth0Boundary({ domain, clientId, children }: Auth0BoundaryProps) {
  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      skipRedirectCallback
    >
      {children}
    </Auth0Provider>
  );
}
