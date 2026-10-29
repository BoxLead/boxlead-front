import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { AuthLayout } from "../../components/AuthLayout/AuthLayout";
import { Loading } from "../../components/Loading";
import { DELETE_ACCOUNT_PATH, REAUTH_INTENT } from "../../data/reauth";
import { SOCIAL_AUTH_ENABLED, SOCIAL_PROVIDERS, socialRedirectUri } from "../../util/social";

const PROVIDER_PARAM = "proveedor";

function Redirecting({ connection }: { connection: string }) {
  const { loginWithRedirect } = useAuth0();
  const [failed, setFailed] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    loginWithRedirect({
      authorizationParams: {
        connection,
        redirect_uri: socialRedirectUri(window.location.origin),
        prompt: "login",
        max_age: 0,
      },
      appState: { next: DELETE_ACCOUNT_PATH, intent: REAUTH_INTENT },
    }).catch(() => setFailed(true));
  }, [connection, loginWithRedirect]);

  if (!failed) return <Loading inline />;
  return (
    <div className="auth-stack">
      <p className="auth-notice" role="alert">
        No pudimos abrir el inicio de sesión. Probá de nuevo desde tu cuenta.
      </p>
      <Link className="auth-submit auth-action" to="/app/cuenta">
        Volver a tu cuenta
      </Link>
    </div>
  );
}

export function Reauthenticate() {
  const [searchParams] = useSearchParams();
  const provider = SOCIAL_PROVIDERS.find((item) => item.id === searchParams.get(PROVIDER_PARAM));

  return (
    <AuthLayout>
      <h1 className="auth-title">Confirmá que sos vos</h1>
      {SOCIAL_AUTH_ENABLED && provider ? (
        <Redirecting connection={provider.connection} />
      ) : (
        <div className="auth-stack">
          <p className="auth-notice" role="alert">
            No pudimos saber con qué cuenta entrás. Volvé a tu cuenta y probá de nuevo.
          </p>
          <Link className="auth-submit auth-action" to="/app/cuenta">
            Volver a tu cuenta
          </Link>
        </div>
      )}
    </AuthLayout>
  );
}
