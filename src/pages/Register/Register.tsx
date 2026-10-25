import { useEffect, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { Loading } from "../../components/Loading";
import { useAuth } from "../../context/auth";
import { loadSignupOptions, PLAN_PARAM, type SignupOptions } from "../../data/plans";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { DEFAULT_APP_PATH, NEXT_PARAM, safeAppPath } from "../../util/redirect";
import { RegisterForm } from "./RegisterForm";

export function Register() {
  useDocumentTitle("Crear cuenta");

  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [options, setOptions] = useState<SignupOptions | null>(null);
  const next = safeAppPath(searchParams.get(NEXT_PARAM)) ?? DEFAULT_APP_PATH;
  const [signedIn] = useState(() => user !== null);

  useEffect(() => {
    if (signedIn) return;
    let cancelled = false;
    void loadSignupOptions().then((loaded) => {
      if (!cancelled) setOptions(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  if (signedIn) {
    return <Navigate to={next} replace />;
  }

  if (!options) {
    return <Loading />;
  }

  return <RegisterForm options={options} next={next} planParam={searchParams.get(PLAN_PARAM)} />;
}
