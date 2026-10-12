import { ApiError } from "../api/client";
import type {
  AgentActivitySummary,
  AgentRequest,
  AgentResponse,
  AgentRunOutcome,
  AgentScope,
  CategoryResponse,
  ChannelRules,
  PlatformType,
  ReplyMode,
  SalesStage,
} from "../api/types";
import { getPlatform, stageChoices } from "../platforms";
import { formatNumber } from "./format";

export const AGENT_NAME_MAX = 80;
export const AGENT_INSTRUCTIONS_MAX = 4000;
export const PROFILE_DESCRIPTION_MAX = 4000;
export const PROFILE_TONE_MAX = 200;
export const MAX_SCOPES = 20;
export const PLAYGROUND_MAX_MESSAGES = 20;
export const PLAYGROUND_MESSAGE_MAX = 2000;

export const ALL_CHANNELS = "Todos los canales";
export const ALL_CATEGORIES = "Todas las categorías";
export const ALL_STAGES = "Todas las etapas";
export const DELETED_CATEGORY = "Categoría eliminada";

export const REPLY_MODE_LABELS: Record<ReplyMode, string> = {
  AUTO: "Automático",
  DRAFT: "Borrador",
};

export const REPLY_MODES = Object.keys(REPLY_MODE_LABELS) as ReplyMode[];

export function emptyScope(): AgentScope {
  return { platform: null, categoryId: null, salesStage: null, replyMode: "AUTO" };
}

export function scopeKey(scope: AgentScope): string {
  return [scope.platform ?? "", scope.categoryId ?? "", scope.salesStage ?? ""].join("|");
}

export function hasDuplicateScopes(scopes: AgentScope[]): boolean {
  return new Set(scopes.map(scopeKey)).size !== scopes.length;
}

export function isOrphanedCategory(
  scope: AgentScope,
  categories: CategoryResponse[] | undefined,
): boolean {
  return (
    scope.categoryId !== null &&
    categories !== undefined &&
    !categories.some((category) => category.id === scope.categoryId)
  );
}

export function withPlatform(scope: AgentScope, platform: PlatformType | null): AgentScope {
  const stillValid = scope.salesStage === null || stageChoices(platform).some((c) => c.value === scope.salesStage);
  return { ...scope, platform, salesStage: stillValid ? scope.salesStage : null };
}

function stageName(platform: PlatformType | null, stage: SalesStage): string {
  return stageChoices(platform).find((choice) => choice.value === stage)?.label ?? stage;
}

function categoryName(scope: AgentScope, categories: CategoryResponse[] | undefined): string {
  if (isOrphanedCategory(scope, categories)) return DELETED_CATEGORY;
  return categories?.find((category) => category.id === scope.categoryId)?.name ?? "Categoría";
}

export function scopeLabel(scope: AgentScope, categories: CategoryResponse[] | undefined): string {
  const parts = [scope.platform ? getPlatform(scope.platform).name : ALL_CHANNELS];
  if (scope.categoryId) parts.push(categoryName(scope, categories));
  if (scope.salesStage) parts.push(stageName(scope.platform, scope.salesStage));
  parts.push(REPLY_MODE_LABELS[scope.replyMode]);
  return parts.join(" · ");
}

export function toAgentRequest(agent: AgentResponse, patch: Partial<AgentRequest> = {}): AgentRequest {
  return {
    name: agent.name,
    instructions: agent.instructions,
    enabled: agent.enabled,
    publicCommentReplies: agent.publicCommentReplies,
    scopes: agent.scopes.map(({ platform, categoryId, salesStage, replyMode }) => ({
      platform,
      categoryId,
      salesStage,
      replyMode,
    })),
    ...patch,
  };
}

export function agentErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) return fallback;
  if (error.status === 429) return "Hiciste muchas pruebas seguidas. Probá de nuevo en un rato.";
  if (error.status === 503) return "No pudimos verificar tus categorías ahora. Probá de nuevo en unos minutos.";
  if (error.status === 422 && /unknown categories/i.test(error.message)) {
    return "Alguna regla usa una categoría que ya no existe. Quitala o elegí otra.";
  }
  if (error.status === 422) return "Revisá los datos: hay campos con valores inválidos.";
  if (error.status === 404) return "Este agente ya no existe. Actualizá la página.";
  return fallback;
}

export type ScopeDraft = { key: string; scope: AgentScope };

export function newScopeDraft(scope: AgentScope = emptyScope()): ScopeDraft {
  return { key: crypto.randomUUID(), scope };
}

export type RuleLine = { label: string; value: string };

export function describeChannelRules(rules: ChannelRules): RuleLine[] {
  return [
    { label: "Canal", value: rules.channelName },
    { label: "Quién lo lee", value: rules.audience === "PUBLIC" ? "Cualquiera (pública)" : "Solo el cliente (privada)" },
    { label: "Largo máximo", value: rules.maxLength ? `${rules.maxLength.toLocaleString("es-AR")} caracteres` : "Sin límite" },
    { label: "Respuesta única", value: rules.singleReply ? "Sí, no se puede corregir ni seguir" : "No" },
    { label: "Datos de contacto", value: rules.contactDetailsAllowed ? "Permitidos" : "No permitidos" },
  ];
}

export function answeredByLabel(agentName: string): string {
  return `Respondido por ${agentName}`;
}

export type ActivityNumbers = {
  labeled: number;
  sent: number;
  drafted: number;
  skipped: number;
  handedOff: number;
};

const OUTCOME_LABELS: Record<AgentRunOutcome, string> = {
  SENT: "Respondió",
  DRAFTED: "Dejó un borrador",
  HANDOFF: "Derivó",
  SKIPPED: "Omitió",
  SUPERSEDED: "Omitió",
};

const REASON_LABELS: Record<string, string> = {
  event_too_old: "El mensaje era demasiado viejo",
  not_latest_inbound: "Llegó un mensaje más nuevo",
  last_message_not_inbound: "El último mensaje no es del cliente",
  needs_attention: "La conversación ya necesitaba atención",
  human_took_over: "Una persona ya había respondido",
  no_matching_scope: "Ninguna regla coincidía",
  public_comments_disabled: "Este agente no responde comentarios públicos",
  comments_not_supported: "El canal no permite responder comentarios",
  "a newer message arrived": "Llegó un mensaje más nuevo",
};

const REASON_LIMIT = 180;

export function activityFor(summary: AgentActivitySummary, agentId: string): ActivityNumbers {
  const found = summary.agents.find((item) => item.agentId === agentId);
  return {
    labeled: found?.labeled ?? 0,
    sent: found?.sent ?? 0,
    drafted: found?.drafted ?? 0,
    skipped: found?.skipped ?? 0,
    handedOff: found?.handedOff ?? 0,
  };
}

export function activityOutcomeLabel(outcome: AgentRunOutcome): string {
  return OUTCOME_LABELS[outcome];
}

export function activityReasonLabel(reason: string | null): string | null {
  if (!reason) return null;
  const text = REASON_LABELS[reason] ?? reason;
  if (text.length <= REASON_LIMIT) return text;
  return `${text.slice(0, REASON_LIMIT - 1)}…`;
}

export function labeledLeadLabel(
  categoryId: string | null,
  categories: CategoryResponse[] | undefined,
): string | null {
  if (!categoryId) return null;
  if (!categories) return "Etiquetó el lead";
  const name = categories.find((category) => category.id === categoryId)?.name;
  return `Etiquetó como ${name ?? DELETED_CATEGORY}`;
}

export function unassignedActivityLine(unassigned: { skipped: number; labeled: number }): string | null {
  const parts: string[] = [];
  if (unassigned.skipped > 0) {
    parts.push(
      unassigned.skipped === 1
        ? "1 mensaje no llegó a ningún agente"
        : `${formatNumber(unassigned.skipped)} mensajes no llegaron a ningún agente`,
    );
  }
  if (unassigned.labeled > 0) {
    parts.push(
      unassigned.labeled === 1
        ? "1 lead se etiquetó sin agente"
        : `${formatNumber(unassigned.labeled)} leads se etiquetaron sin agente`,
    );
  }
  if (parts.length === 0) return null;
  return `${parts.join(" y ")}.`;
}
