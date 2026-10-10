import { ApiError } from "../api/client";
import type {
  AgentRequest,
  AgentResponse,
  AgentScope,
  CategoryResponse,
  ChannelRules,
  PlatformType,
  ReplyMode,
  SalesStage,
} from "../api/types";
import { getPlatform, stageChoices } from "../platforms";

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
