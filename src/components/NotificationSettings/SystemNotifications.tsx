import { useState } from "react";
import { requestSystemPermission, systemPermission, type SystemPermission } from "../Notifications/systemNotifications";
import { Tag, type TagTone } from "../ui/Tag";

type PermissionCopy = { label: string; tone: TagTone; help: string };

const COPY: Record<SystemPermission, PermissionCopy> = {
  default: {
    label: "Sin activar",
    tone: "neutral",
    help: "Te avisamos con una notificación del sistema cuando BoxLead está abierto y estás en otra ventana. El navegador te va a pedir permiso.",
  },
  granted: {
    label: "Activadas",
    tone: "success",
    help: "Te avisamos con una notificación del sistema cuando BoxLead está abierto y estás en otra ventana, sin nombres ni mensajes.",
  },
  denied: {
    label: "Bloqueadas en el navegador",
    tone: "warning",
    help: "Para activarlas, permití las notificaciones de BoxLead desde la configuración del sitio en tu navegador.",
  },
  unsupported: {
    label: "No disponibles",
    tone: "neutral",
    help: "Este navegador no muestra notificaciones del sistema. Vas a seguir viendo los avisos dentro de la app.",
  },
};

export function SystemNotifications({ browserOn }: { browserOn: boolean }) {
  const [permission, setPermission] = useState<SystemPermission>(systemPermission);
  const [asking, setAsking] = useState(false);
  const copy = COPY[permission];

  async function activate() {
    setAsking(true);
    setPermission(await requestSystemPermission());
    setAsking(false);
  }

  return (
    <div className="notification-system">
      <div className="notification-system-text">
        <p className="notification-system-title">
          <span>Notificaciones del sistema</span>
          <Tag tone={copy.tone}>{copy.label}</Tag>
        </p>
        <p className="field-help" aria-live="polite">
          {copy.help}
          {browserOn || permission === "unsupported" ? "" : " Solo aparecen con los avisos en el navegador prendidos."}
        </p>
      </div>
      {permission === "default" ? (
        <button type="button" className="btn btn-secondary" onClick={() => void activate()} disabled={asking}>
          Activar notificaciones del sistema
        </button>
      ) : null}
    </div>
  );
}
