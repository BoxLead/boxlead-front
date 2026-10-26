import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cx } from "../../util/classNames";
import "./Dialog.css";

type DialogProps = {
  open: boolean;
  title: string;
  description?: string;
  size?: "sm" | "md" | "lg";
  busy?: boolean;
  onClose: () => void;
  children: ReactNode;
};

function reducedMotion(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function Dialog({ open, title, description, size = "md", busy = false, onClose, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const pressedOutside = useRef(false);
  const [closing, setClosing] = useState(false);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open) {
      setClosing(false);
      if (!dialog.open) dialog.showModal?.();
      return;
    }
    if (!dialog.open) return;
    if (reducedMotion() || typeof dialog.getAnimations !== "function") {
      dialog.close?.();
      return;
    }
    setClosing(true);
    const timer = window.setTimeout(() => {
      dialog.close?.();
      setClosing(false);
    }, 180);
    return () => window.clearTimeout(timer);
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={cx("dialog", `dialog-${size}`, closing && "dialog-closing")}
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
      {open || closing ? (
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
