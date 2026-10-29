import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/auth";

type Feature = "billing" | "reseller" | "account";

export function FeatureRoute({ feature }: { feature: Feature }) {
  const { user, features, isReseller } = useAuth();
  const enabled =
    feature === "billing" ? features.billing : feature === "account" ? user?.account?.settings === true : isReseller;
  return enabled ? <Outlet /> : <Navigate to="/app" replace />;
}
