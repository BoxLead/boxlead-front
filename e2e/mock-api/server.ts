import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type {
  AccountConnectionResponse,
  CategoryColor,
  CategoryResponse,
  ConversationResponse,
  LeadResponse,
  LeadStatus,
  MessageResponse,
  PlatformType,
  SalesStage,
} from "../../src/api/types.ts";
import {
  buildState,
  MELI_SELLER_ID,
  nextId,
  type MockState,
  type Scenario,
  type StoredConversation,
} from "./fixtures.ts";
import { PRODUCT_IMAGES } from "./images.ts";

const PORT = Number(process.env.MOCK_API_PORT ?? 8090);
const APP_ORIGIN = process.env.MOCK_APP_ORIGIN ?? "http://localhost:5173";
const SELF = `http://localhost:${PORT}`;
const SESSION_COOKIE = "boxlead_session";
const DEMO_PASSWORD = "demo1234";
const USER = { userId: "0b0e0000-0000-4000-8000-000000000001", email: "demo@boxlead.app" };
const PLATFORMS: PlatformType[] = ["META", "INSTAGRAM", "TIKTOK", "WHATSAPP", "GOOGLE_ADS", "MELI"];
const LEAD_STATUSES: LeadStatus[] = ["NEW", "CONTACTED", "QUALIFIED", "LOST", "CLOSED"];
const MELI_ANSWER_LIMIT = 2000;
const MELI_MESSAGE_LIMIT = 350;
const CATEGORY_COLORS: CategoryColor[] = ["BLUE", "GREEN", "YELLOW", "ORANGE", "RED", "PURPLE", "PINK", "GRAY"];
const MAX_CATEGORIES = 30;
const NAME_IN_USE = "Category name already in use";

let state: MockState = buildState("default");

type Json = Record<string, unknown> | unknown[] | null;

function send(res: ServerResponse, status: number, body?: Json, headers: Record<string, string> = {}) {
  res.writeHead(status, { "Content-Type": "application/json", ...headers });
  res.end(body === undefined ? "" : JSON.stringify(body));
}

function fail(res: ServerResponse, status: number, message: string) {
  send(res, status, { error: message, message });
}

async function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  if (!raw) return {};
  const parsed: unknown = JSON.parse(raw);
  return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
}

function isAuthed(req: IncomingMessage): boolean {
  return (req.headers.cookie ?? "").split(/;\s*/).includes(`${SESSION_COOKIE}=valid`);
}

function sessionCookie(value: string, maxAge: number): string {
  return `${SESSION_COOKIE}=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

function parsePlatform(value: string | null | undefined): PlatformType | null {
  if (!value) return null;
  const upper = value.toUpperCase() as PlatformType;
  return PLATFORMS.includes(upper) ? upper : null;
}

function activity(conversation: StoredConversation): string {
  const last = lastMessage(conversation.id);
  return last?.createdAt ?? conversation.updatedAt;
}

function messagesOf(conversationId: string): MessageResponse[] {
  return state.messages
    .filter((m) => m.conversationId === conversationId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

function lastMessage(conversationId: string): MessageResponse | undefined {
  return messagesOf(conversationId).at(-1);
}

function summary(conversation: StoredConversation): ConversationResponse {
  const { replyContextId: _ignored, ...rest } = conversation;
  void _ignored;
  const last = lastMessage(conversation.id);
  const leadRef = state.leads.find((l) => l.id === conversation.leadId);
  const unreadCount = messagesOf(conversation.id).filter(
    (m) =>
      m.direction === "INBOUND" &&
      (!conversation.lastReadAt || m.createdAt > conversation.lastReadAt),
  ).length;
  return {
    ...rest,
    leadName: leadRef?.name ?? null,
    lastMessagePreview: last?.content ? last.content.slice(0, 140) : null,
    lastMessageDirection: last?.direction ?? null,
    lastMessageAt: last?.createdAt ?? null,
    unreadCount,
  };
}

function connectionFor(conversation: StoredConversation): AccountConnectionResponse | undefined {
  const prefix = conversation.externalThreadId?.split("_")[0];
  return state.connections.find(
    (c) => c.platform === conversation.platform && c.externalAccountId === prefix,
  );
}

function absoluteImage<T extends { imageUrl: string | null }>(item: T): T {
  return item.imageUrl?.startsWith("/__img/") ? { ...item, imageUrl: `${SELF}${item.imageUrl}` } : item;
}

function meliReply(
  res: ServerResponse,
  conversation: StoredConversation,
  content: string,
): MessageResponse | null {
  const connection = connectionFor(conversation);
  if (connection?.needsReconnection) {
    fail(res, 409, `MELI account ${connection.id} must be reconnected: its authorization expired or was revoked`);
    return null;
  }
  if (conversation.salesStage === "PRE_SALE") {
    if (content.length > MELI_ANSWER_LIMIT) {
      fail(res, 400, `MELI answers are limited to ${MELI_ANSWER_LIMIT} characters`);
      return null;
    }
    const all = messagesOf(conversation.id);
    const answered = new Set(
      all
        .filter((m) => m.direction === "OUTBOUND" && m.externalMessageId?.endsWith(":answer"))
        .map((m) => m.externalMessageId?.replace(/:answer$/, "")),
    );
    const open = all.find(
      (m) => m.direction === "INBOUND" && m.externalMessageId && !answered.has(m.externalMessageId),
    );
    if (!open?.externalMessageId) {
      fail(res, 409, "Cannot send MELI message: MELI only lets you answer open pre-sale questions, and this buyer has none unanswered.");
      return null;
    }
    return {
      id: nextId("5e55"),
      conversationId: conversation.id,
      direction: "OUTBOUND",
      externalMessageId: `${open.externalMessageId}:answer`,
      content,
      contextRef: open.contextRef ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
  if (content.length > MELI_MESSAGE_LIMIT) {
    fail(res, 400, `MELI messages are limited to ${MELI_MESSAGE_LIMIT} characters`);
    return null;
  }
  if (!conversation.replyContextId) {
    fail(res, 409, "Cannot send MELI message: no order/pack is known for this conversation yet. It is learned from the buyer's next message.");
    return null;
  }
  return {
    id: nextId("5e55"),
    conversationId: conversation.id,
    direction: "OUTBOUND",
    externalMessageId: nextId("meli").replace(/-/g, ""),
    content,
    contextRef: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function withLeadCount(category: Omit<CategoryResponse, "leadCount">): CategoryResponse {
  return { ...category, leadCount: state.leads.filter((l) => l.categoryId === category.id).length };
}

function nameTaken(name: string, exceptId: string | null): boolean {
  const wanted = name.toLocaleLowerCase("es-AR");
  return state.categories.some((c) => c.id !== exceptId && c.name.toLocaleLowerCase("es-AR") === wanted);
}

function normalizeDescription(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function validateCategory(body: Record<string, unknown>, creating: boolean): string | null {
  const name = body.name;
  if (creating || name !== undefined) {
    if (typeof name !== "string" || !name.trim() || name.length > 40) return "Validation failed";
  }
  if (body.description !== undefined && body.description !== null) {
    if (typeof body.description !== "string" || body.description.length > 280) return "Validation failed";
  }
  if (creating || body.color !== undefined) {
    if (!CATEGORY_COLORS.includes(body.color as CategoryColor)) return "Validation failed";
  }
  return null;
}

function oauthUrl(platform: PlatformType, redirectUri: string) {
  const host = platform === "MELI" ? "auth.mercadolibre.test" : "www.facebook.test";
  const url = new URL(`https://${host}/authorization`);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("client_id", "mock");
  return url.toString();
}

async function handle(req: IncomingMessage, res: ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", APP_ORIGIN);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Vary", "Origin");
  const method = req.method ?? "GET";
  if (method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept, X-Requested-With");
    return send(res, 200);
  }

  const url = new URL(req.url ?? "/", SELF);
  const path = url.pathname;
  const parts = path.split("/").filter(Boolean);

  if (path === "/__health") return send(res, 200, { ok: true });
  if (path === "/__reset" && method === "POST") {
    const body = await readBody(req);
    const scenario = (body.scenario as Scenario | undefined) ?? "default";
    state = buildState(scenario);
    return send(res, 200, { scenario });
  }
  if (parts[0] === "__img") {
    const svg = PRODUCT_IMAGES[(parts[1] ?? "").replace(/\.svg$/, "")];
    if (!svg) return fail(res, 404, "Not found");
    res.writeHead(200, { "Content-Type": "image/svg+xml", "Cache-Control": "max-age=3600" });
    return res.end(svg);
  }

  if (method !== "GET" && req.headers["x-requested-with"] !== "boxlead-web") {
    return fail(res, 403, "Forbidden");
  }

  if (path === "/auth/login" && method === "POST") {
    const body = await readBody(req);
    if (body.password !== DEMO_PASSWORD) return fail(res, 401, "Invalid email or password");
    return send(res, 200, USER, { "Set-Cookie": sessionCookie("valid", 86400) });
  }
  if (path === "/auth/register" && method === "POST") {
    return send(res, 201, USER, { "Set-Cookie": sessionCookie("valid", 86400) });
  }
  if (path === "/auth/logout" && method === "POST") {
    return send(res, 204, undefined, { "Set-Cookie": sessionCookie("", 0) });
  }
  if (!isAuthed(req)) return fail(res, 401, "Unauthorized");
  if (path === "/auth/me") return send(res, 200, USER);

  if (parts[0] === "categories") {
    if (parts.length === 1 && method === "GET") {
      return send(res, 200, [...state.categories].sort((a, b) => a.position - b.position).map(withLeadCount));
    }
    if (parts.length === 1 && method === "POST") {
      const body = await readBody(req);
      const invalid = validateCategory(body, true);
      if (invalid) return fail(res, 400, invalid);
      if (state.categories.length >= MAX_CATEGORIES) {
        return fail(res, 409, `You can have up to ${MAX_CATEGORIES} categories`);
      }
      const name = (body.name as string).trim();
      if (nameTaken(name, null)) return fail(res, 409, NAME_IN_USE);
      const now = new Date().toISOString();
      const created = {
        id: nextId("ca7e"),
        name,
        description: normalizeDescription(body.description),
        color: body.color as CategoryColor,
        position: state.categories.length,
        createdAt: now,
        updatedAt: now,
      };
      state.categories.push(created);
      return send(res, 201, withLeadCount(created));
    }
    const category = state.categories.find((c) => c.id === parts[1]);
    if (!category) return fail(res, 404, "Category not found");
    if (method === "PATCH") {
      const body = await readBody(req);
      const invalid = validateCategory(body, false);
      if (invalid) return fail(res, 400, invalid);
      if (typeof body.name === "string") {
        const name = body.name.trim();
        if (nameTaken(name, category.id)) return fail(res, 409, NAME_IN_USE);
        category.name = name;
      }
      if (typeof body.description === "string") category.description = normalizeDescription(body.description);
      if (typeof body.color === "string") category.color = body.color as CategoryColor;
      category.updatedAt = new Date().toISOString();
      return send(res, 200, withLeadCount(category));
    }
    if (method === "DELETE") {
      state.categories = state.categories.filter((c) => c.id !== category.id);
      for (const leadRef of state.leads) {
        if (leadRef.categoryId === category.id) leadRef.categoryId = null;
      }
      return send(res, 204);
    }
  }

  if (parts[0] === "leads") {
    if (parts[2] === "category" && method === "PUT") {
      const leadRef = state.leads.find((l) => l.id === parts[1]);
      if (!leadRef) return fail(res, 404, "Lead not found");
      const body = await readBody(req);
      const categoryId = typeof body.categoryId === "string" ? body.categoryId : null;
      if (categoryId && !state.categories.some((c) => c.id === categoryId)) {
        return fail(res, 400, "Category not found or does not belong to you");
      }
      leadRef.categoryId = categoryId;
      leadRef.updatedAt = new Date().toISOString();
      return send(res, 200, leadRef);
    }
    if (parts.length === 1 && method === "GET") {
      const status = url.searchParams.get("status");
      const includePostSale = url.searchParams.get("includePostSale") === "true";
      if (status && !LEAD_STATUSES.includes(status as LeadStatus)) {
        return fail(res, 400, "Invalid value for parameter 'status'");
      }
      const leads = state.leads.filter(
        (l) => (includePostSale || !l.postSaleOnly) && (!status || l.status === status),
      );
      return send(res, 200, leads);
    }
    const leadRef = state.leads.find((l) => l.id === parts[1]);
    if (!leadRef) return fail(res, 404, "Lead not found");
    if (method === "GET") return send(res, 200, leadRef);
    if (method === "PATCH") {
      const body = await readBody(req);
      const patch: Partial<LeadResponse> = {};
      if (typeof body.status === "string" && LEAD_STATUSES.includes(body.status as LeadStatus)) {
        patch.status = body.status as LeadStatus;
      }
      for (const key of ["name", "email", "phone"] as const) {
        if (typeof body[key] === "string") patch[key] = body[key];
      }
      Object.assign(leadRef, patch, { updatedAt: new Date().toISOString() });
      return send(res, 200, leadRef);
    }
  }

  if (parts[0] === "conversations") {
    if (parts.length === 1 && method === "GET") {
      const platform = parsePlatform(url.searchParams.get("platform"));
      const stage = url.searchParams.get("salesStage") as SalesStage | null;
      const leadId = url.searchParams.get("leadId");
      const limit = Number(url.searchParams.get("limit") ?? "0");
      const before = url.searchParams.get("before");
      let list = state.conversations
        .filter((c) => !platform || c.platform === platform)
        .filter((c) => !stage || c.salesStage === stage)
        .filter((c) => !leadId || c.leadId === leadId)
        .sort((a, b) => activity(b).localeCompare(activity(a)));
      if (limit > 0) {
        list = list.filter((c) => !before || activity(c) < before).slice(0, limit);
      }
      return send(res, 200, list.map(summary));
    }
    if (parts.length === 1 && method === "POST") {
      const body = await readBody(req);
      const leadRef = state.leads.find((l) => l.id === body.leadId);
      if (!leadRef) return fail(res, 404, "Lead not found");
      const now = new Date().toISOString();
      const created: StoredConversation = {
        id: nextId("c0ff"),
        leadId: leadRef.id,
        platform: leadRef.platform,
        externalThreadId: null,
        salesStage: "PRE_SALE",
        status: "OPEN",
        lastReadAt: now,
        replyContextId: null,
        createdAt: now,
        updatedAt: now,
      };
      state.conversations.push(created);
      return send(res, 201, summary(created));
    }
    const conversation = state.conversations.find((c) => c.id === parts[1]);
    if (!conversation) return fail(res, 404, "Conversation not found");
    if (parts.length === 2 && method === "GET") return send(res, 200, summary(conversation));
    if (parts[2] === "read" && method === "POST") {
      conversation.lastReadAt = new Date().toISOString();
      return send(res, 204);
    }
    if (parts[2] === "context" && method === "GET") {
      if (conversation.platform !== "MELI") return send(res, 200, { items: [] });
      const account = connectionFor(conversation);
      if (account?.needsReconnection) {
        return fail(res, 409, `MELI account ${account.id} must be reconnected: its authorization expired or was revoked`);
      }
      if (conversation.salesStage === "POST_SALE") {
        const orders = conversation.replyContextId ? state.orders[conversation.replyContextId] ?? [] : [];
        return send(res, 200, { items: orders.map(absoluteImage) });
      }
      const refs = [...new Set(messagesOf(conversation.id).map((m) => m.contextRef).filter(Boolean))];
      const items = refs.map((ref) => state.listings[ref as string]).filter(Boolean).map(absoluteImage);
      return send(res, 200, { items });
    }
    if (parts[2] === "messages" && method === "GET") {
      return send(res, 200, messagesOf(conversation.id));
    }
    if (parts[2] === "messages" && method === "POST") {
      const body = await readBody(req);
      const content = typeof body.content === "string" ? body.content : "";
      if (body.direction === "OUTBOUND" && conversation.platform === "MELI" && !content.trim()) {
        return fail(res, 400, "MELI message cannot be empty");
      }
      let created: MessageResponse | null;
      if (body.direction === "OUTBOUND" && conversation.platform === "MELI") {
        created = meliReply(res, conversation, content);
        if (!created) return;
      } else {
        created = {
          id: nextId("5e55"),
          conversationId: conversation.id,
          direction: body.direction === "INBOUND" ? "INBOUND" : "OUTBOUND",
          externalMessageId: null,
          content,
          contextRef: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
      state.messages.push(created);
      conversation.updatedAt = created.createdAt;
      return send(res, 201, created);
    }
  }

  if (parts[0] === "comments" && parts[1] === "threads") {
    if (parts.length === 2) {
      const leadId = url.searchParams.get("leadId");
      return send(res, 200, state.threads.filter((t) => !leadId || t.leadId === leadId));
    }
    const thread = state.threads.find((t) => t.id === parts[2]);
    if (!thread) return fail(res, 404, "Comment thread not found");
    if (parts[3] === "comments") {
      return send(res, 200, state.comments.filter((c) => c.commentThreadId === thread.id));
    }
    return send(res, 200, thread);
  }

  if (parts[0] === "oauth") {
    if (parts[1] === "connections" && parts.length === 2) return send(res, 200, state.connections);
    if (parts[1] === "connections" && method === "DELETE") {
      const before = state.connections.length;
      state.connections = state.connections.filter((c) => c.id !== parts[2]);
      return before === state.connections.length ? fail(res, 404, "Connection not found") : send(res, 204);
    }
    const platform = parsePlatform(parts[1]);
    if (!platform) return fail(res, 400, `Invalid value for parameter 'platform'`);
    if (parts[2] === "config") {
      return send(res, 200, platform === "WHATSAPP" ? { appId: "mock-app", configId: "mock-config" } : {});
    }
    if (parts[2] === "auth-url") {
      const redirectUri = url.searchParams.get("redirectUri") ?? "";
      if (platform === "WHATSAPP") return fail(res, 500, "Internal server error");
      return send(res, 200, platform === "MELI"
        ? { url: oauthUrl(platform, redirectUri), codeVerifier: "mock-verifier" }
        : { url: oauthUrl(platform, redirectUri) });
    }
    if (parts[2] === "callback" && method === "POST") {
      const body = await readBody(req);
      if (typeof body.code !== "string" || !body.code) return fail(res, 400, "Validation failed");
      if (body.code === "rejected") return fail(res, 502, "MELI token exchange failed (HTTP 400 BAD_REQUEST)");
      if (platform === "MELI" && body.codeVerifier !== "mock-verifier") return fail(res, 400, "Missing PKCE verifier");
      const externalAccountId = platform === "MELI" ? MELI_SELLER_ID : `${platform.toLowerCase()}-${body.code}`;
      const existing = state.connections.find(
        (c) => c.platform === platform && c.externalAccountId === externalAccountId,
      );
      const connection: AccountConnectionResponse = existing ?? {
        id: nextId("acc0"),
        platform,
        externalAccountId,
        displayName: platform === "MELI" ? "TIENDA_NORTE" : `Cuenta ${platform.toLowerCase()}`,
        connectedAt: new Date().toISOString(),
        needsReconnection: false,
        lastEventAt: null,
        failedEventCount: 0,
      };
      connection.needsReconnection = false;
      if (!existing) state.connections.push(connection);
      return send(res, 200, [connection]);
    }
  }

  return fail(res, 404, "Not found");
}

createServer((req, res) => {
  handle(req, res).catch((error: unknown) => {
    console.error(error);
    if (!res.headersSent) fail(res, 500, "Internal server error");
  });
}).listen(PORT, () => {
  console.log(`Mock API on ${SELF} for ${APP_ORIGIN}, MELI seller ${MELI_SELLER_ID}`);
});
