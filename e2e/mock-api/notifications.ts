import type {
  AppNotification,
  NotificationKind,
  NotificationSettings,
  PlatformType,
  UnsubscribeScope,
} from "../../src/api/types.ts";
import type { MockReply, MockRequest } from "./billing.ts";
import { clockNow, nextId } from "./fixtures.ts";

export const UNSUBSCRIBE_TOKEN = "baja-demo-7f3k";
const PAGE_SIZE = 50;
const KINDS: NotificationKind[] = ["NEW_LEAD", "HANDOFF"];
const PLATFORMS: PlatformType[] = ["META", "INSTAGRAM", "WHATSAPP", "MELI", "TIKTOK", "GOOGLE_ADS"];
const SCOPES: UnsubscribeScope[] = ["NEW_LEAD", "HANDOFF", "ALL"];

export type NotificationsOptions = {
  notices?: number;
};

export type NotificationsState = {
  notices: AppNotification[];
  seen: number[];
  settings: NotificationSettings;
  unsubscribes: { token: string; scope: UnsubscribeScope }[];
};

function notice(id: number, kind: NotificationKind, platform: PlatformType): AppNotification {
  const lead = kind === "NEW_LEAD" ? nextId("lead") : null;
  return {
    id,
    kind,
    platform,
    leadId: lead,
    conversationId: nextId("conv"),
    createdAt: new Date(clockNow()).toISOString(),
  };
}

export function buildNotifications(options: NotificationsOptions = {}): NotificationsState {
  const count = Math.max(0, Math.min(options.notices ?? 0, 500));
  return {
    notices: Array.from({ length: count }, (_, index) => notice(index + 1, "NEW_LEAD", "WHATSAPP")),
    seen: [],
    settings: { newLeadEmail: true, handoffEmail: true, browser: true },
    unsubscribes: [],
  };
}

function latestId(state: NotificationsState): number {
  return state.notices.at(-1)?.id ?? 0;
}

function error(status: number, message: string): MockReply {
  return { status, body: { error: message, message } };
}

function parseSettings(body: Record<string, unknown>): NotificationSettings | null {
  const { newLeadEmail, handoffEmail, browser } = body;
  if (typeof newLeadEmail !== "boolean" || typeof handoffEmail !== "boolean" || typeof browser !== "boolean") return null;
  return { newLeadEmail, handoffEmail, browser };
}

export function appendNotice(state: NotificationsState, body: Record<string, unknown>): MockReply {
  const kind = KINDS.find((item) => item === body.kind);
  const platform = PLATFORMS.find((item) => item === body.platform) ?? "WHATSAPP";
  if (!kind) return error(400, "Unknown kind");
  const created = notice(latestId(state) + 1, kind, platform);
  state.notices.push(created);
  return { status: 201, body: created };
}

export function inspectNotifications(state: NotificationsState): MockReply {
  return {
    status: 200,
    body: { latest: latestId(state), seen: state.seen, settings: state.settings, unsubscribes: state.unsubscribes },
  };
}

function unsubscribe(state: NotificationsState, body: Record<string, unknown>): MockReply {
  const scope = SCOPES.find((item) => item === body.scope);
  if (typeof body.token !== "string" || !scope) return { status: 204 };
  state.unsubscribes.push({ token: body.token, scope });
  if (body.token !== UNSUBSCRIBE_TOKEN) return { status: 204 };
  if (scope !== "HANDOFF") state.settings.newLeadEmail = false;
  if (scope !== "NEW_LEAD") state.settings.handoffEmail = false;
  return { status: 204 };
}

export async function notificationsRoute(
  state: NotificationsState,
  enabled: boolean,
  req: Pick<MockRequest, "method" | "parts" | "query" | "authed" | "readBody">,
): Promise<MockReply | null> {
  const { method, parts, query } = req;
  if (parts[0] !== "notifications") return null;
  if (parts[1] === "unsubscribe" && parts.length === 2 && method === "POST") {
    return unsubscribe(state, await req.readBody());
  }
  if (!req.authed) return error(401, "Unauthorized");
  if (!enabled) return error(404, "Not found");
  if (parts.length === 1 && method === "GET") {
    const after = query.get("after");
    if (after === null) return { status: 200, body: { notifications: [], cursor: latestId(state) } };
    const from = Number(after);
    if (!Number.isInteger(from) || from < 0) return error(400, "Validation failed");
    const page = state.notices.filter((item) => item.id > from).slice(0, PAGE_SIZE);
    return { status: 200, body: { notifications: page, cursor: page.at(-1)?.id ?? from } };
  }
  if (parts[1] === "seen" && parts.length === 2 && method === "POST") {
    const upTo = (await req.readBody()).upTo;
    if (typeof upTo !== "number" || !Number.isInteger(upTo) || upTo < 0) return error(400, "Validation failed");
    state.seen.push(upTo);
    return { status: 204 };
  }
  if (parts[1] === "settings" && parts.length === 2) {
    if (method === "GET") return { status: 200, body: state.settings };
    if (method === "PUT") {
      const settings = parseSettings(await req.readBody());
      if (!settings) return error(400, "Validation failed");
      state.settings = settings;
      return { status: 200, body: settings };
    }
  }
  return error(405, "Method not allowed");
}
