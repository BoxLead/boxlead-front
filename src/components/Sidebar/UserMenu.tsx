import { useEffect, useId, useRef, useState } from "react";
import { useAuth } from "../../context/auth";
import { setTheme, useTheme } from "../../theme/theme";
import { Avatar } from "../ui/Avatar";
import { LogoutIcon, MoonIcon, SunIcon } from "../icons/UiIcons";
import "./UserMenu.css";

function ThemeSwitch({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="theme-switch">
      <span className="visually-hidden">Modo claro</span>
      <input
        type="checkbox"
        role="switch"
        className="theme-switch-input"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="theme-switch-track" aria-hidden="true">
        <MoonIcon width={14} height={14} className="theme-switch-moon" />
        <SunIcon width={14} height={14} className="theme-switch-sun" />
      </span>
    </label>
  );
}

export function UserMenu() {
  const { user, logout } = useAuth();
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const name = user?.name?.trim() || null;
  const email = user?.email ?? "";

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    }

    function onPointer(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setOpen(false);
    }

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  function closeAndLogout() {
    setOpen(false);
    logout();
  }

  return (
    <div className="account-menu">
      <button
        ref={buttonRef}
        type="button"
        className="account-menu-trigger"
        aria-label="Cuenta"
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
      >
        <Avatar name={name || email || "?"} size="sm" />
        <span className="account-menu-trigger-label">{email}</span>
      </button>
      {open ? (
        <div
          ref={panelRef}
          id={panelId}
          className="account-menu-panel"
          role="dialog"
          aria-label="Cuenta"
          aria-modal="false"
          tabIndex={-1}
        >
          <div className="account-menu-identity">
            <Avatar name={name || email || "?"} />
            <div className="account-menu-id">
              {name ? <p className="account-menu-name">{name}</p> : null}
              <p className={name ? "account-menu-email" : "account-menu-name"}>{email}</p>
            </div>
          </div>
          <div className="account-menu-row">
            {theme === "light" ? <SunIcon /> : <MoonIcon />}
            <span>Tema</span>
            <ThemeSwitch checked={theme === "light"} onChange={(light) => setTheme(light ? "light" : "dark")} />
          </div>
          <button type="button" className="account-menu-action" onClick={closeAndLogout}>
            <LogoutIcon />
            <span>Cerrar sesión</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
