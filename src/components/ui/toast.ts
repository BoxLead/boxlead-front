import { createContext, useContext } from "react";

export type ToastTone = "success" | "info" | "danger";

export type ToastInput = {
  tone?: ToastTone;
  message: string;
};

export const ToastContext = createContext<((toast: ToastInput) => void) | null>(null);

export function useToast(): (toast: ToastInput) => void {
  const show = useContext(ToastContext);
  if (!show) throw new Error("useToast must be used within ToastProvider");
  return show;
}
