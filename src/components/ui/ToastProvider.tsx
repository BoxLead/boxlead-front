import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { CheckIcon, CloseIcon, InfoIcon, AlertIcon } from "../icons/UiIcons";
import { ToastContext, type ToastInput, type ToastTone } from "./toast";
import "./Toast.css";

type Toast = { id: number; tone: ToastTone; message: string };

const DURATION_MS = 4500;
const ICONS: Record<ToastTone, ReactNode> = {
  success: <CheckIcon />,
  info: <InfoIcon />,
  danger: <AlertIcon />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const show = useCallback(
    ({ tone = "success", message }: ToastInput) => {
      nextId.current += 1;
      const id = nextId.current;
      setToasts((current) => [...current.slice(-2), { id, tone, message }]);
      timers.current.set(id, setTimeout(() => dismiss(id), DURATION_MS));
    },
    [dismiss],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((timer) => clearTimeout(timer));
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toast-region" aria-live="polite" aria-relevant="additions">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.tone}`} role={toast.tone === "danger" ? "alert" : "status"}>
            <span className="toast-icon">{ICONS[toast.tone]}</span>
            <span className="toast-message">{toast.message}</span>
            <button type="button" className="toast-close" onClick={() => dismiss(toast.id)} aria-label="Cerrar aviso">
              <CloseIcon width={16} height={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
