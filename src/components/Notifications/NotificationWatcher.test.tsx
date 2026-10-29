import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../api/client";
import type { AppNotification, NotificationSettings } from "../../api/types";
import { AuthContext, SESSION_FLAGS_OFF, type AuthContextValue } from "../../context/auth";
import { NOTIFICATIONS_POLL_MS } from "../../data/notificationWatcher";
import { clearQueryCache } from "../../data/queryCache";
import { titleWithBadge, useTitleBadge } from "../../hooks/useDocumentTitle";
import { ToastContext, type ToastInput } from "../ui/toast";
import { NotificationWatcher } from "./NotificationWatcher";

vi.mock(import("../../api/client"), async (importOriginal) => {
  const original = await importOriginal();
  return { ...original, api: { ...original.api, get: vi.fn(), post: vi.fn(), put: vi.fn() } };
});

const ON: NotificationSettings = { newLeadEmail: true, handoffEmail: true, browser: true };

function notice(id: number, kind: AppNotification["kind"] = "NEW_LEAD"): AppNotification {
  return { id, kind, platform: "WHATSAPP", leadId: null, conversationId: null, createdAt: "2026-10-29T12:00:00Z" };
}

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

function Probe() {
  const badge = useTitleBadge();
  const navigate = useNavigate();
  return (
    <>
      <h1>{titleWithBadge("Leads", badge)}</h1>
      <button type="button" onClick={() => navigate("/app/inbox")}>
        Bandeja
      </button>
    </>
  );
}

function title(): string {
  return screen.getByRole("heading").textContent ?? "";
}

type Server = { settings: NotificationSettings | null; pages: { notifications: AppNotification[]; cursor: number }[] };

function serve(server: Server) {
  vi.mocked(api.get).mockImplementation((path: string) => {
    if (path === "/notifications/settings") {
      return server.settings ? Promise.resolve(server.settings) : Promise.reject(new Error("404"));
    }
    if (path === "/notifications") return Promise.resolve({ notifications: [], cursor: 10 });
    if (path.startsWith("/notifications?after=")) {
      return Promise.resolve(server.pages.shift() ?? { notifications: [], cursor: 10 });
    }
    return Promise.resolve([]);
  });
}

function renderWatcher(notifications: boolean, path = "/app/leads") {
  const toasts: ToastInput[] = [];
  render(
    <MemoryRouter initialEntries={[path]}>
      <AuthContext.Provider value={session(notifications)}>
        <ToastContext.Provider value={(toast) => toasts.push(toast)}>
          <Routes>
            <Route path="*" element={<><NotificationWatcher /><Probe /></>} />
          </Routes>
        </ToastContext.Provider>
      </AuthContext.Provider>
    </MemoryRouter>,
  );
  return toasts;
}

function paths(): string[] {
  return vi.mocked(api.get).mock.calls.map(([path]) => path);
}

beforeEach(() => {
  vi.useFakeTimers();
  clearQueryCache();
  vi.mocked(api.post).mockResolvedValue(undefined);
  vi.spyOn(document, "hasFocus").mockReturnValue(true);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("NotificationWatcher", () => {
  it("asks nothing while the flag is off", async () => {
    serve({ settings: ON, pages: [] });
    renderWatcher(false);
    await act(() => vi.advanceTimersByTimeAsync(NOTIFICATIONS_POLL_MS * 2));
    expect(api.get).not.toHaveBeenCalled();
  });

  it("does not poll when the browser notices are turned off", async () => {
    serve({ settings: { ...ON, browser: false }, pages: [] });
    renderWatcher(true);
    await act(() => vi.advanceTimersByTimeAsync(NOTIFICATIONS_POLL_MS * 2));
    expect(paths()).toEqual(["/notifications/settings"]);
  });

  it("shows one toast per kind, counts them in the title and marks them seen", async () => {
    serve({ settings: ON, pages: [{ notifications: [notice(11), notice(12), notice(13, "HANDOFF")], cursor: 13 }] });
    const toasts = renderWatcher(true);
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(paths()).toContain("/notifications");
    await act(() => vi.advanceTimersByTimeAsync(NOTIFICATIONS_POLL_MS));
    expect(toasts).toEqual([
      { tone: "info", message: "Entraron 2 leads nuevos por WhatsApp" },
      { tone: "info", message: "Una conversación necesita tu respuesta" },
    ]);
    expect(title()).toBe("(3) Leads");
    expect(api.post).toHaveBeenCalledWith("/notifications/seen", { upTo: 13 });
  });

  it("clears the count when the window gets the focus back or the inbox opens", async () => {
    serve({
      settings: ON,
      pages: [
        { notifications: [notice(11)], cursor: 11 },
        { notifications: [notice(12)], cursor: 12 },
      ],
    });
    renderWatcher(true);
    await act(() => vi.advanceTimersByTimeAsync(NOTIFICATIONS_POLL_MS));
    expect(title()).toBe("(1) Leads");
    act(() => {
      window.dispatchEvent(new Event("focus"));
    });
    expect(title()).toBe("Leads");
    await act(() => vi.advanceTimersByTimeAsync(NOTIFICATIONS_POLL_MS));
    expect(title()).toBe("(1) Leads");
    fireEvent.click(screen.getByRole("button", { name: "Bandeja" }));
    expect(title()).toBe("Leads");
  });

  it("leaves the title alone while the inbox is open and focused", async () => {
    serve({ settings: ON, pages: [{ notifications: [notice(11)], cursor: 11 }] });
    const toasts = renderWatcher(true, "/app/inbox");
    await act(() => vi.advanceTimersByTimeAsync(NOTIFICATIONS_POLL_MS));
    expect(toasts).toHaveLength(1);
    expect(title()).toBe("Leads");
  });

  it("shows a system notification without names only when permitted and away", async () => {
    const shown: { title: string; options?: NotificationOptions }[] = [];
    class FakeNotification {
      static permission: NotificationPermission = "granted";
      onclick: (() => void) | null = null;
      constructor(title: string, options?: NotificationOptions) {
        shown.push({ title, options });
      }
      close() {}
    }
    vi.stubGlobal("Notification", FakeNotification);
    vi.mocked(document.hasFocus).mockReturnValue(false);
    serve({ settings: ON, pages: [{ notifications: [notice(11, "HANDOFF")], cursor: 11 }, { notifications: [notice(12)], cursor: 12 }] });
    renderWatcher(true);
    await act(() => vi.advanceTimersByTimeAsync(NOTIFICATIONS_POLL_MS));
    expect(shown).toEqual([
      { title: "BoxLead", options: { body: "Una conversación necesita tu respuesta", tag: "boxlead-HANDOFF", icon: "/icons/icon-192.png" } },
    ]);
    FakeNotification.permission = "default";
    await act(() => vi.advanceTimersByTimeAsync(NOTIFICATIONS_POLL_MS));
    expect(shown).toHaveLength(1);
    vi.unstubAllGlobals();
  });
});
