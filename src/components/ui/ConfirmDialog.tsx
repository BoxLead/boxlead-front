import type { ReactNode } from "react";
import { Dialog } from "./Dialog";
import "./ConfirmDialog.css";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  children?: ReactNode;
  confirmLabel: string;
  tone?: "danger" | "primary";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  tone = "primary",
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} title={title} size="sm" busy={busy} onClose={onCancel}>
      {children ? <div className="confirm-dialog-text">{children}</div> : null}
      <div className="dialog-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy}>
          Cancelar
        </button>
        <button
          type="button"
          className={tone === "danger" ? "btn btn-danger" : "btn btn-primary"}
          onClick={onConfirm}
          disabled={busy}
        >
          {confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}
