import { useEffect, useId, useRef, type ReactNode } from "react";
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
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal?.();
    if (!open && dialog.open) dialog.close?.();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="confirm-dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      {open ? (
        <div className="confirm-dialog-body">
          <h2 id={titleId} className="confirm-dialog-title">
            {title}
          </h2>
          {children ? <div className="confirm-dialog-text">{children}</div> : null}
          <div className="confirm-dialog-actions">
            <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy}>
              Cancelar
            </button>
            <button
              type="button"
              className={`btn ${tone === "danger" ? "btn-danger" : "btn-primary"}`}
              onClick={onConfirm}
              disabled={busy}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      ) : null}
    </dialog>
  );
}
