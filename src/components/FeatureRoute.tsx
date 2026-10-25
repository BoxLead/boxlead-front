import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/auth";

type Feature = "billing" | "reseller";

export function FeatureRoute({ feature }: { feature: Feature }) {
  const { features, isReseller } = useAuth();
  const enabled = feature === "billing" ? features.billing : isReseller;
  return enabled ? <Outlet /> : <Navigate to="/" replace />;
}
