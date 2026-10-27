import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cx } from "../../util/classNames";
import "./Dialog.css";

type DialogProps = {
  open: boolean;
  title: string;
  description?: string;
  size?: "sm" | "md" | "lg";
  busy?: boolean;
  dismissible?: boolean;
  onClose: () => void;
  children: ReactNode;
};

const CLOSE_MS = 180;

function reducedMotion(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function Dialog({ open, title, description, size = "md", busy = false, dismissible = true, onClose, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const pressedOutside = useRef(false);
  const [visible, setVisible] = useState(open);
  if (open && !visible) setVisible(true);
  const titleId = useId();
  const descriptionId = useId();
  const locked = busy || !dismissible;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open) {
      dialog.classList.remove("dialog-closing");
      if (!dialog.open) dialog.showModal?.();
      return;
    }
    if (!dialog.open) return;
    const finish = () => {
      dialog.classList.remove("dialog-closing");
      dialog.close?.();
      setVisible(false);
    };
    if (reducedMotion() || typeof dialog.getAnimations !== "function") {
      finish();
      return;
    }
    dialog.classList.add("dialog-closing");
    const timer = window.setTimeout(finish, CLOSE_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={cx("dialog", `dialog-${size}`)}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        if (!locked) onClose();
      }}
      onPointerDown={(event) => {
        pressedOutside.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && pressedOutside.current && !locked) onClose();
      }}
    >
      {visible ? (
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
