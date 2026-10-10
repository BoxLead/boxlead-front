import type {
  AgentResponse,
  AgentScope,
  ChannelRules,
  PlatformType,
  PlaygroundResult,
  ReplyMode,
  SalesStage,
} from "../../src/api/types.ts";
import { nextId } from "./fixtures.ts";

export const MAX_AGENT_NAME = 80;
export const MAX_TEXT = 4000;
export const MAX_TONE = 200;
export const MAX_SCOPES = 20;
export const MAX_PLAYGROUND_MESSAGES = 20;
export const MAX_PLAYGROUND_MESSAGE_LENGTH = 2000;
export const PLAYGROUND_RUNS_PER_HOUR = 30;

const REPLY_MODES: ReplyMode[] = ["AUTO", "DRAFT"];
const SALES_STAGES: SalesStage[] = ["PRE_SALE", "POST_SALE"];
const PLATFORM_PATTERN = /^[A-Z][A-Z0-9_]*$/;
const HANDOFF_PATTERN = /persona|humano|reclamo|abogado/i;

const CHANNEL_NAMES: Record<string, string> = {
  MELI: "MercadoLibre",
  WHATSAPP: "WhatsApp",
  INSTAGRAM: "Instagram",
  META: "Messenger",
};

type Json = Record<string, unknown>;

function isRecord(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseScope(raw: unknown): AgentScope | null {
  if (!isRecord(raw)) return null;
  const { platform, categoryId, salesStage, replyMode } = raw;
  if (platform !== null && platform !== undefined && (typeof platform !== "string" || !PLATFORM_PATTERN.test(platform))) {
    return null;
  }
  if (categoryId !== null && categoryId !== undefined && typeof categoryId !== "string") return null;
  if (salesStage !== null && salesStage !== undefined && !SALES_STAGES.includes(salesStage as SalesStage)) return null;
  if (!REPLY_MODES.includes(replyMode as ReplyMode)) return null;
  return {
    platform: (platform as PlatformType | null | undefined) ?? null,
    categoryId: (categoryId as string | null | undefined) ?? null,
    salesStage: (salesStage as SalesStage | null | undefined) ?? null,
    replyMode: replyMode as ReplyMode,
  };
}

export type AgentInput = { name: string; instructions: string; enabled: boolean; scopes: AgentScope[] };

export function parseAgentBody(body: Json): AgentInput | null {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > MAX_AGENT_NAME) return null;
  const instructions = body.instructions === undefined ? "" : body.instructions;
  if (typeof instructions !== "string" || instructions.length > MAX_TEXT) return null;
  if (body.enabled !== undefined && typeof body.enabled !== "boolean") return null;
  if (!Array.isArray(body.scopes) || body.scopes.length < 1 || body.scopes.length > MAX_SCOPES) return null;
  const scopes: AgentScope[] = [];
  for (const raw of body.scopes) {
    const scope = parseScope(raw);
    if (!scope) return null;
    scopes.push(scope);
  }
  const keys = scopes.map((s) => `${s.platform}|${s.categoryId}|${s.salesStage}`);
  if (new Set(keys).size !== keys.length) return null;
  return { name, instructions, enabled: body.enabled ?? true, scopes };
}

export function unknownCategories(scopes: AgentScope[], known: string[]): string[] {
  return [...new Set(scopes.map((s) => s.categoryId).filter((id): id is string => id !== null && !known.includes(id)))];
}

export function toAgentResponse(input: AgentInput, position: number, existing?: AgentResponse): AgentResponse {
  const now = new Date().toISOString();
  return {
    id: existing?.id ?? nextId("a9e1"),
    name: input.name,
    instructions: input.instructions,
    enabled: input.enabled,
    position,
    scopes: input.scopes.map((scope) => ({ ...scope, id: nextId("5c0e") })),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

export type ProfileInput = { description: string; tone: string | null; autoCategorize: boolean };

export function parseProfileBody(body: Json): ProfileInput | null {
  const description = body.description === undefined ? "" : body.description;
  if (typeof description !== "string" || description.length > MAX_TEXT) return null;
  const tone = body.tone === undefined || body.tone === null ? null : body.tone;
  if (tone !== null && (typeof tone !== "string" || tone.length > MAX_TONE)) return null;
  const auto = body.autoCategorize === undefined ? true : body.autoCategorize;
  if (typeof auto !== "boolean") return null;
  return { description, tone: tone ? tone.trim() || null : null, autoCategorize: auto };
}

function specificity(scope: AgentScope): number[] {
  return [scope.categoryId ? 1 : 0, scope.salesStage ? 1 : 0, scope.platform ? 1 : 0];
}

function compareSpecificity(a: AgentScope, b: AgentScope): number {
  const left = specificity(a);
  const right = specificity(b);
  for (let i = 0; i < left.length; i += 1) {
    if (left[i] !== right[i]) return right[i] - left[i];
  }
  return 0;
}

export function resolveReplyMode(
  agent: AgentResponse,
  platform: string,
  stage: SalesStage,
  categoryId: string | null,
): ReplyMode | null {
  const matching = agent.scopes.filter(
    (scope) =>
      (scope.platform === null || scope.platform === platform) &&
      (scope.salesStage === null || scope.salesStage === stage) &&
      (scope.categoryId === null || scope.categoryId === categoryId),
  );
  matching.sort(compareSpecificity);
  return matching[0]?.replyMode ?? null;
}

export function channelRulesFor(platform: string, stage: SalesStage): ChannelRules {
  const channelName = CHANNEL_NAMES[platform] ?? platform;
  if (platform === "MELI") {
    const preSale = stage === "PRE_SALE";
    return {
      channelName,
      maxLength: preSale ? 2000 : 350,
      audience: preSale ? "PUBLIC" : "PRIVATE",
      singleReply: preSale,
      contactDetailsAllowed: false,
      guidelines: ["Respondé con el nombre del producto y sin datos de contacto."],
    };
  }
  return {
    channelName,
    maxLength: 2000,
    audience: "PRIVATE",
    singleReply: false,
    contactDetailsAllowed: true,
    guidelines: [],
  };
}

export type PlaygroundRequest = {
  customerMessage: string;
  platform: string;
  stage: SalesStage;
  categoryId: string | null;
  agentId: string | null;
  unsavedName: string | null;
  threadId: string;
  runId: string;
};

export type PlaygroundProblem = { status: number; message: string };

export function parsePlaygroundRequest(body: Json): PlaygroundRequest | PlaygroundProblem {
  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length < 1 || messages.length > MAX_PLAYGROUND_MESSAGES) {
    return { status: 422, message: `Send between 1 and ${MAX_PLAYGROUND_MESSAGES} messages` };
  }
  for (const message of messages) {
    const role = isRecord(message) ? message.role : undefined;
    if (role !== "user" && role !== "assistant") {
      return { status: 422, message: `Messages with role '${String(role)}' are not accepted; use user, assistant` };
    }
    const content = (message as Json).content;
    if (typeof content !== "string" || !content.trim() || content.length > MAX_PLAYGROUND_MESSAGE_LENGTH) {
      return { status: 422, message: `Messages must be plain text of up to ${MAX_PLAYGROUND_MESSAGE_LENGTH} characters` };
    }
  }
  const last = messages[messages.length - 1] as Json;
  if (last.role !== "user") return { status: 422, message: "The last message must come from the customer" };
  const state = isRecord(body.state) ? body.state : {};
  const platform = typeof state.platform === "string" && PLATFORM_PATTERN.test(state.platform) ? state.platform : null;
  if (!platform) return { status: 422, message: "The playground state is invalid: platform" };
  const agentId = typeof state.agentId === "string" ? state.agentId : null;
  const unsaved = isRecord(state.agent) ? state.agent : null;
  if ((agentId === null) === (unsaved === null)) {
    return { status: 422, message: "The playground state is invalid: send either agentId or agent" };
  }
  const stage = SALES_STAGES.includes(state.salesStage as SalesStage) ? (state.salesStage as SalesStage) : "PRE_SALE";
  return {
    customerMessage: last.content as string,
    platform,
    stage,
    categoryId: typeof state.categoryId === "string" ? state.categoryId : null,
    agentId,
    unsavedName: unsaved && typeof unsaved.name === "string" ? unsaved.name : null,
    threadId: typeof body.threadId === "string" ? body.threadId : nextId("7ead"),
    runId: typeof body.runId === "string" ? body.runId : nextId("2a11"),
  };
}

export function playgroundEvents(
  request: PlaygroundRequest,
  agentName: string,
  replyMode: ReplyMode | null,
): Json[] {
  const hands = HANDOFF_PATTERN.test(request.customerMessage);
  const result: PlaygroundResult = {
    decision: hands ? "HANDOFF" : "REPLY",
    reason: hands ? "El cliente pidió hablar con una persona." : null,
    replyMode,
    channelRules: channelRulesFor(request.platform, request.stage),
    violations: [],
  };
  const messageId = nextId("6e55");
  const events: Json[] = [
    { type: "RUN_STARTED", threadId: request.threadId, runId: request.runId },
    { type: "STEP_STARTED", stepName: "respond" },
    { type: "STEP_FINISHED", stepName: "respond" },
    { type: "STEP_STARTED", stepName: "validate" },
    { type: "STEP_FINISHED", stepName: "validate" },
  ];
  if (!hands) {
    events.push(
      { type: "TEXT_MESSAGE_START", messageId, role: "assistant" },
      {
        type: "TEXT_MESSAGE_CONTENT",
        messageId,
        delta: `¡Hola! Soy ${agentName}. Gracias por escribir, enseguida te ayudo.`,
      },
      { type: "TEXT_MESSAGE_END", messageId },
    );
  }
  events.push(
    { type: "STATE_SNAPSHOT", snapshot: result },
    { type: "RUN_FINISHED", threadId: request.threadId, runId: request.runId },
  );
  return events;
}

export function encodeEvents(events: Json[]): string {
  return events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("");
}
