import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "../../api/client";
import type { NotificationSettings as Settings } from "../../api/types";
import { AuthContext, SESSION_FLAGS_OFF, type AuthContextValue } from "../../context/auth";
import { NOTIFICATION_SETTINGS_KEY } from "../../data/notifications";
import { clearQueryCache, getQueryState } from "../../data/queryCache";
import { ToastContext, type ToastInput } from "../ui/toast";
import { NotificationSettings } from "./NotificationSettings";

vi.mock(import("../../api/client"), async (importOriginal) => {
  const original = await importOriginal();
  return { ...original, api: { ...original.api, get: vi.fn(), put: vi.fn() } };
});

const SAVED: Settings = { newLeadEmail: true, handoffEmail: true, browser: true };

function session(notifications: boolean): AuthContextValue {
  return {
    ...SESSION_FLAGS_OFF,
    features: { ...SESSION_FLAGS_OFF.features, notifications },
    user: null,
    login: vi.fn(),
    register: vi.fn(),
    socialLogin: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
    isLoading: false,
    error: null,
    clearError: vi.fn(),
  };
}

function renderSettings(notifications = true) {
  const toasts: ToastInput[] = [];
  render(
    <AuthContext.Provider value={session(notifications)}>
      <ToastContext.Provider value={(toast) => toasts.push(toast)}>
        <NotificationSettings />
      </ToastContext.Provider>
    </AuthContext.Provider>,
  );
  return toasts;
}

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  let reject: (error: unknown) => void = () => undefined;
  const promise = new Promise<T>((settle, fail) => {
    resolve = settle;
    reject = fail;
  });
  return { promise, resolve, reject };
}

class FakeNotification {
  static permission: NotificationPermission = "default";
  static requestPermission = vi.fn(async () => {
    FakeNotification.permission = "granted";
    return FakeNotification.permission;
  });
}

beforeEach(() => {
  clearQueryCache();
  vi.mocked(api.get).mockResolvedValue({ ...SAVED });
  FakeNotification.permission = "default";
  vi.stubGlobal("Notification", FakeNotification);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("NotificationSettings", () => {
  it("renders nothing and asks nothing while the flag is off", () => {
    renderSettings(false);
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalled();
  });

  it("shows the three preferences as they are saved", async () => {
    vi.mocked(api.get).mockResolvedValue({ ...SAVED, handoffEmail: false });
    renderSettings();
    expect(screen.getByRole("status", { name: "Cargando preferencias" })).toBeInTheDocument();
    expect(await screen.findByRole("switch", { name: "Mail cuando entra un lead nuevo" })).toBeChecked();
    expect(screen.getByRole("switch", { name: "Mail cuando el agente pasa una conversación a una persona" })).not.toBeChecked();
    expect(screen.getByRole("switch", { name: "Avisos en el navegador con la app abierta" })).toBeChecked();
    expect(api.get).toHaveBeenCalledWith(NOTIFICATION_SETTINGS_KEY);
  });

  it("switches at once and keeps what the server saved", async () => {
    const save = deferred<Settings>();
    vi.mocked(api.put).mockReturnValue(save.promise);
    renderSettings();
    const lead = await screen.findByRole("switch", { name: "Mail cuando entra un lead nuevo" });
    await userEvent.click(lead);
    expect(lead).not.toBeChecked();
    expect(api.put).toHaveBeenCalledWith(NOTIFICATION_SETTINGS_KEY, { ...SAVED, newLeadEmail: false });
    save.resolve({ ...SAVED, newLeadEmail: false });
    await waitFor(() => expect(lead).toBeEnabled());
    expect(lead).not.toBeChecked();
    expect(getQueryState<Settings>(NOTIFICATION_SETTINGS_KEY).data).toEqual({ ...SAVED, newLeadEmail: false });
  });

  it("goes back and says so when saving fails", async () => {
    vi.mocked(api.put).mockRejectedValue(new ApiError("Boom", 500));
    const toasts = renderSettings();
    const browser = await screen.findByRole("switch", { name: "Avisos en el navegador con la app abierta" });
    await userEvent.click(browser);
    await waitFor(() => expect(browser).toBeChecked());
    expect(toasts).toEqual([{ tone: "danger", message: "No pudimos guardar el cambio. Probá de nuevo." }]);
    expect(getQueryState<Settings>(NOTIFICATION_SETTINGS_KEY).data).toEqual(SAVED);
  });

  it("explains a loading error and retries", async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new ApiError("No pudimos cargar los datos.", 500));
    renderSettings();
    expect(await screen.findByText("No pudimos cargar tus preferencias")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByRole("switch", { name: "Mail cuando entra un lead nuevo" })).toBeChecked();
  });

  it("asks for the system permission only on click and shows the result", async () => {
    renderSettings();
    const activate = await screen.findByRole("button", { name: "Activar notificaciones del sistema" });
    expect(FakeNotification.requestPermission).not.toHaveBeenCalled();
    await userEvent.click(activate);
    expect(FakeNotification.requestPermission).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Activadas")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Activar notificaciones del sistema" })).not.toBeInTheDocument();
  });

  it("explains a blocked or missing system permission", async () => {
    FakeNotification.permission = "denied";
    renderSettings();
    expect(await screen.findByText("Bloqueadas en el navegador")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Activar notificaciones del sistema" })).not.toBeInTheDocument();
  });

  it("says when the browser has no system notifications", async () => {
    vi.unstubAllGlobals();
    expect("Notification" in window).toBe(false);
    renderSettings();
    expect(await screen.findByText("No disponibles")).toBeInTheDocument();
  });
});
