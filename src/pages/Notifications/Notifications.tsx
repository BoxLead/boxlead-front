import { Navigate } from "react-router-dom";
import { NotificationSettings } from "../../components/NotificationSettings/NotificationSettings";
import { useAuth } from "../../context/auth";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import "./Notifications.css";

export function Notifications() {
  useDocumentTitle("Notificaciones");
  const { features } = useAuth();
  if (!features.notifications) return <Navigate to="/app" replace />;

  return (
    <div className="page notifications-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Notificaciones</h1>
          <p className="page-header-desc">Elegí por dónde te enterás de los leads nuevos y de las conversaciones que te esperan.</p>
        </div>
      </header>
      <NotificationSettings />
    </div>
  );
}
