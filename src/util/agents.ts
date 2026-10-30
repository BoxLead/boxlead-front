import i18next from "i18next";
import { ApiError } from "../api/client";
import { apiErrorCode } from "../api/errors";
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
import { intlLocale } from "../i18n/locale";

export const AGENT_NAME_MAX = 80;
export const AGENT_INSTRUCTIONS_MAX = 4000;
export const PROFILE_DESCRIPTION_MAX = 4000;
export const PROFILE_TONE_MAX = 200;
export const MAX_SCOPES = 20;
export const PLAYGROUND_MAX_MESSAGES = 20;
export const PLAYGROUND_MESSAGE_MAX = 2000;

export const REPLY_MODES: ReplyMode[] = ["AUTO", "DRAFT"];

export function replyModeLabel(mode: ReplyMode): string {
  return i18next.t(`replyModes.${mode}`, { ns: "agents" });
}

export function deletedCategoryLabel(): string {
  return i18next.t("scopes.deletedCategory", { ns: "agents" });
}

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
  if (isOrphanedCategory(scope, categories)) return deletedCategoryLabel();
  return categories?.find((category) => category.id === scope.categoryId)?.name ?? i18next.t("scopes.unknownCategory", { ns: "agents" });
}

export function scopeLabel(scope: AgentScope, categories: CategoryResponse[] | undefined): string {
  const parts = [scope.platform ? getPlatform(scope.platform).name : i18next.t("scopes.allChannels", { ns: "agents" })];
  if (scope.categoryId) parts.push(categoryName(scope, categories));
  if (scope.salesStage) parts.push(stageName(scope.platform, scope.salesStage));
  parts.push(replyModeLabel(scope.replyMode));
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
  const code = apiErrorCode(error);
  if (code === "PLAN_REQUIRED" || code === "PLAN_LIMIT_REACHED" || code === "ENTITLEMENTS_UNAVAILABLE") return error.message;
  if (error.status === 429) return i18next.t("errors.tooManyTests", { ns: "agents" });
  if (error.status === 503) return i18next.t("errors.categoriesUnavailable", { ns: "agents" });
  if (error.status === 422 && /unknown categories/i.test(error.message)) {
    return i18next.t("errors.unknownCategories", { ns: "agents" });
  }
  if (error.status === 422) return i18next.t("errors.invalidFields", { ns: "agents" });
  if (error.status === 404) return i18next.t("errors.agentGone", { ns: "agents" });
  return fallback;
}

export function playgroundErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError && apiErrorCode(error) === "PLAN_LIMIT_REACHED") {
    return i18next.t("errors.playgroundLimit", { ns: "agents" });
  }
  return agentErrorMessage(error, fallback);
}

export type ScopeDraft = { key: string; scope: AgentScope };

export function newScopeDraft(scope: AgentScope = emptyScope()): ScopeDraft {
  return { key: crypto.randomUUID(), scope };
}

export type RuleLine = { label: string; value: string };

export function describeChannelRules(rules: ChannelRules): RuleLine[] {
  const t = i18next.getFixedT(null, "agents");
  return [
    { label: t("rules.channel"), value: rules.channelName },
    { label: t("rules.audience"), value: rules.audience === "PUBLIC" ? t("rules.audiencePublic") : t("rules.audiencePrivate") },
    {
      label: t("rules.maxLength"),
      value: rules.maxLength ? t("rules.maxLengthValue", { value: rules.maxLength.toLocaleString(intlLocale()) }) : t("rules.noLimit"),
    },
    { label: t("rules.singleReply"), value: rules.singleReply ? t("rules.singleReplyYes") : t("rules.singleReplyNo") },
    { label: t("rules.contactDetails"), value: rules.contactDetailsAllowed ? t("rules.contactAllowed") : t("rules.contactNotAllowed") },
  ];
}

export function answeredByLabel(agentName: string): string {
  return i18next.t("answeredBy", { ns: "agents", name: agentName });
}

export function workingAgentLabel(agentName: string): string {
  return i18next.t("working", { ns: "agents", name: agentName });
}

export type ActivityNumbers = {
  labeled: number;
  sent: number;
  drafted: number;
  skipped: number;
  handedOff: number;
};

const REASON_KEYS = {
  event_too_old: "eventTooOld",
  not_latest_inbound: "newerMessage",
  last_message_not_inbound: "lastNotInbound",
  needs_attention: "needsAttention",
  human_took_over: "humanTookOver",
  no_matching_scope: "noMatchingScope",
  public_comments_disabled: "publicCommentsDisabled",
  comments_not_supported: "commentsNotSupported",
  "a newer message arrived": "newerMessage",
  plan: "noPlan",
  plan_limit: "planLimit",
  public_comments_not_in_plan: "publicCommentsNotInPlan",
} as const;

function isKnownReason(reason: string): reason is keyof typeof REASON_KEYS {
  return Object.hasOwn(REASON_KEYS, reason);
}

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
  return i18next.t(`outcomes.${outcome}`, { ns: "agents" });
}

export function activityReasonLabel(reason: string | null): string | null {
  if (!reason) return null;
  const text = isKnownReason(reason) ? i18next.t(`reasons.${REASON_KEYS[reason]}`, { ns: "agents" }) : reason;
  if (text.length <= REASON_LIMIT) return text;
  return `${text.slice(0, REASON_LIMIT - 1)}…`;
}

export function labeledLeadLabel(
  categoryId: string | null,
  categories: CategoryResponse[] | undefined,
): string | null {
  if (!categoryId) return null;
  if (!categories) return i18next.t("labeled.lead", { ns: "agents" });
  const name = categories.find((category) => category.id === categoryId)?.name;
  return i18next.t("labeled.as", { ns: "agents", name: name ?? deletedCategoryLabel() });
}

export function unassignedActivityLine(unassigned: { skipped: number; labeled: number }): string | null {
  const t = i18next.getFixedT(null, "agents");
  const parts: string[] = [];
  if (unassigned.skipped > 0) {
    parts.push(t("unassigned.skipped", { count: unassigned.skipped, value: formatNumber(unassigned.skipped) }));
  }
  if (unassigned.labeled > 0) {
    parts.push(t("unassigned.labeled", { count: unassigned.labeled, value: formatNumber(unassigned.labeled) }));
  }
  if (parts.length === 0) return null;
  if (parts.length === 1) return t("unassigned.single", { part: parts[0] });
  return t("unassigned.both", { first: parts[0], second: parts[1] });
}

export function agentStatusLabel(agent: AgentResponse): string {
  const t = i18next.getFixedT(null, "agents");
  if (!agent.enabled) return t("status.paused");
  return agent.overPlanLimit ? t("status.overPlan") : t("status.active");
}

export function overPlanLimitLine(agents: AgentResponse[], max: number | null | undefined): string | null {
  const names = agents.filter((agent) => agent.overPlanLimit).map((agent) => agent.name);
  if (names.length === 0) return null;
  const t = i18next.getFixedT(null, "agents");
  const who =
    names.length === 1
      ? t("overPlan.one", { name: names[0] })
      : t("overPlan.many", { names: names.slice(0, -1).join(", "), last: names[names.length - 1] });
  if (typeof max !== "number") return t("overPlan.line", { who });
  return t("overPlan.lineWithMax", { who, allowed: t("overPlan.allowed", { count: max, value: formatNumber(max) }) });
}
