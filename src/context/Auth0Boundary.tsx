import type { ReactNode } from "react";
import { Auth0Provider } from "@auth0/auth0-react";
import { socialRedirectUri } from "../util/social";

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
      authorizationParams={{ redirect_uri: socialRedirectUri(window.location.origin) }}
      skipRedirectCallback
    >
      {children}
    </Auth0Provider>
  );
}
