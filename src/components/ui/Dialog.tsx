import { useEffect, useId, useRef, type ReactNode } from "react";
import { cx } from "../../util/classNames";
import "./Dialog.css";

type DialogProps = {
  open: boolean;
  title: string;
  description?: string;
  size?: "sm" | "md";
  busy?: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function Dialog({ open, title, description, size = "md", busy = false, onClose, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const pressedOutside = useRef(false);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal?.();
    if (!open && dialog.open) dialog.close?.();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={cx("dialog", `dialog-${size}`)}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      onPointerDown={(event) => {
        pressedOutside.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && pressedOutside.current && !busy) onClose();
      }}
    >
      {open ? (
        <div className="dialog-body">
          <header className="dialog-head">
            <h2 id={titleId} className="dialog-title">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="dialog-description">
                {description}
              </p>
            ) : null}
          </header>
          {children}
        </div>
      ) : null}
    </dialog>
  );
}
