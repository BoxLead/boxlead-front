import { useTranslation } from "react-i18next";
import { Navigate } from "react-router-dom";
import { NotificationSettings } from "../../components/NotificationSettings/NotificationSettings";
import { useAuth } from "../../context/auth";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import "./Notifications.css";

export function Notifications() {
  const { t } = useTranslation("account");
  useDocumentTitle(t("notifications.title"));
  const { features } = useAuth();
  if (!features.notifications) return <Navigate to="/app" replace />;

  return (
    <div className="page notifications-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">{t("notifications.title")}</h1>
          <p className="page-header-desc">{t("notifications.description")}</p>
        </div>
      </header>
      <NotificationSettings />
    </div>
  );
}
