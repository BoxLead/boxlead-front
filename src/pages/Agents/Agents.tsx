import i18next from "i18next";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ApiError } from "../../api/client";
import type { AgentActivitySummary, AgentResponse, CategoryResponse } from "../../api/types";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { PlanLink } from "../../components/PlanBanner/PlanLink";
import { SEE_PLANS } from "../../components/PlanBanner/planNotice";
import { Banner } from "../../components/ui/Banner";
import { ChoiceGroup } from "../../components/ui/ChoiceGroup";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { useToast } from "../../components/ui/toast";
import { ACTIVITY_KEY, AGENTS_KEY, deleteAgent, setAgentEnabled } from "../../data/agents";
import { CATEGORIES_KEY } from "../../data/categories";
import { useApiQuery } from "../../hooks/useApiQuery";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { usePlan } from "../../hooks/usePlan";
import {
  activityFor,
  agentErrorMessage,
  overPlanLimitLine,
  unassignedActivityLine,
  type ActivityNumbers,
} from "../../util/agents";
import { cx } from "../../util/classNames";
import { AgentList } from "./AgentList";
import { AgentWorkspace, type AgentTab } from "./AgentWorkspace";
import { BusinessProfilePanel } from "./BusinessProfilePanel";
import "./Agents.css";

const NEW_AGENT = "new";
const WIDE_QUERY = "(min-width: 761px)";

type Section = "agents" | "profile";
type Destination =
  | { kind: "open"; id: string }
  | { kind: "close" }
  | { kind: "profile" }
  | { kind: "agents" };

function sectionFrom(params: URLSearchParams): Section {
  return params.get("view") === "profile" ? "profile" : "agents";
}

function tabFrom(params: URLSearchParams): AgentTab {
  const tab = params.get("tab");
  if (tab === "test" || tab === "activity") return tab;
  return "config";
}

export function Agents() {
  const { t } = useTranslation("agents");
  useDocumentTitle(t("page.title"));

  const toast = useToast();
  const plan = usePlan();
  const wide = useMediaQuery(WIDE_QUERY);
  const [searchParams, setSearchParams] = useSearchParams();
  const agents = useApiQuery<AgentResponse[]>(AGENTS_KEY);
  const categories = useApiQuery<CategoryResponse[]>(CATEGORIES_KEY);
  const activity = useApiQuery<AgentActivitySummary>(agents.data ? ACTIVITY_KEY : null);
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState<Destination | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AgentResponse | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deletedId, setDeletedId] = useState<string | null>(null);

  const section = sectionFrom(searchParams);
  const tab = tabFrom(searchParams);
  const list = agents.data ?? [];
  const requestedId = searchParams.get("id");
  const paramId = requestedId === deletedId && !list.some((agent) => agent.id === requestedId) ? null : requestedId;
  const creating = paramId === NEW_AGENT;
  const explicit = paramId && !creating ? (list.find((agent) => agent.id === paramId) ?? null) : null;
  const missing = Boolean(paramId && !creating && agents.data && !explicit);
  const selected = creating ? null : (explicit ?? (wide && !paramId ? (list[0] ?? null) : null));
  const open = paramId !== null;
  const unassigned = activity.data ? unassignedActivityLine(activity.data.unassigned) : null;
  const overLimit = plan.billing ? overPlanLimitLine(list, plan.limits.AGENTS_MAX) : null;

  function countsFor(id: string): ActivityNumbers | undefined {
    if (!activity.data) return undefined;
    return activityFor(activity.data, id);
  }

  function currentId(): string | null {
    if (section !== "agents") return null;
    if (paramId) return paramId;
    if (wide) return list[0]?.id ?? null;
    return null;
  }

  function write(destination: Destination) {
    const next = new URLSearchParams(searchParams);
    if (destination.kind === "profile") {
      next.set("view", "profile");
      next.delete("id");
      next.delete("tab");
    } else if (destination.kind === "agents") {
      next.delete("view");
    } else if (destination.kind === "close") {
      next.delete("id");
      next.delete("tab");
    } else {
      next.delete("view");
      next.set("id", destination.id);
      next.delete("tab");
    }
    if (next.toString() !== searchParams.toString()) setSearchParams(next, { replace: true });
  }

  function commit(destination: Destination) {
    setDirty(false);
    setPending(null);
    write(destination);
  }

  function request(destination: Destination) {
    if (destination.kind === "open" && destination.id === currentId()) return;
    if (destination.kind === "profile" && section === "profile") return;
    if (destination.kind === "agents" && section === "agents") return;
    if (destination.kind === "close" && !paramId) return;
    if (dirty && section === "agents") {
      setPending(destination);
      return;
    }
    commit(destination);
  }

  function changeTab(nextTab: AgentTab) {
    const next = new URLSearchParams(searchParams);
    next.delete("view");
    const id = paramId ?? (wide ? (list[0]?.id ?? null) : null);
    if (id) next.set("id", id);
    if (nextTab === "config") next.delete("tab");
    else next.set("tab", nextTab);
    if (next.toString() !== searchParams.toString()) setSearchParams(next, { replace: true });
  }

  async function toggle(agent: AgentResponse, enabled: boolean) {
    setToggling(agent.id);
    try {
      await setAgentEnabled(agent, enabled);
      toast({ tone: "info", message: enabled ? t("page.enabled", { name: agent.name }) : t("page.paused", { name: agent.name }) });
    } catch (error) {
      toast({ tone: "danger", message: agentErrorMessage(error, t("page.toggleFailed")) });
    } finally {
      setToggling(null);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const removedId = pendingDelete.id;
    setDeleting(true);
    setDeletedId(removedId);
    try {
      await deleteAgent(removedId);
      toast({ tone: "info", message: t("page.deleted", { name: pendingDelete.name }) });
      setPendingDelete(null);
      if (requestedId === removedId) write({ kind: "close" });
    } catch (error) {
      setDeletedId(null);
      toast({
        tone: "danger",
        message: error instanceof ApiError ? agentErrorMessage(error, t("page.deleteFailed")) : t("page.deleteFailed"),
      });
    } finally {
      setDeleting(false);
    }
  }

  const failures = [
    categories.error && !categories.data
      ? { key: "categories", title: t("page.loadCategoriesFailed"), message: categories.error, reload: categories.reload }
      : null,
    activity.error && !activity.data
      ? { key: "activity", title: t("page.loadActivityFailed"), message: activity.error, reload: activity.reload }
      : null,
    agents.error && !agents.data
      ? { key: "agents", title: t("page.loadAgentsFailed"), message: agents.error, reload: agents.reload }
      : null,
  ].filter((failure) => failure !== null);

  const createButton = (
    <button
      type="button"
      className="btn btn-primary"
      onClick={() => request({ kind: "open", id: NEW_AGENT })}
      disabled={!agents.data || plan.restricted}
    >
      {t("page.newAgent")}
    </button>
  );

  const workspaceAgent = creating ? null : selected;

  return (
    <div className={cx("agents", open && "agents-open")}>
      <header className="agents-header">
        <div className="agents-heading">
          <h1 className="page-title">{t("page.title")}</h1>
          <p className="page-header-desc">{t("page.description")}</p>
          {unassigned ? <p className="agents-unassigned">{unassigned}</p> : null}
        </div>
        <div className="agents-header-actions">
          <ChoiceGroup
            label={t("page.sectionLabel")}
            variant="segmented"
            value={section}
            choices={[
              { value: "agents", label: t("page.sectionAgents") },
              { value: "profile", label: t("page.sectionProfile") },
            ]}
            onChange={(value) => request(value === "profile" ? { kind: "profile" } : { kind: "agents" })}
          />
          {section === "agents" && list.length > 0 ? createButton : null}
        </div>
      </header>

      {overLimit ? (
        <div className="agents-alerts">
          <Banner tone="warning" title={t("page.overLimitTitle")} action={<PlanLink action={SEE_PLANS} />}>
            {overLimit}
          </Banner>
        </div>
      ) : null}

      {failures.length > 0 ? (
        <div className="agents-alerts">
          {failures.map((failure) => (
            <Banner
              key={failure.key}
              tone="danger"
              title={failure.title}
              action={
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => void failure.reload()}>
                  {t("page.retry")}
                </button>
              }
            >
              {failure.message}
            </Banner>
          ))}
        </div>
      ) : null}

      {section === "profile" ? (
        <div className="profile-view">
          <BusinessProfilePanel />
        </div>
      ) : agents.loading && !agents.data ? (
        <div className="agents-panels" aria-hidden="true">
          <div className="agents-list">
            <div className="skeleton agent-row-skeleton" />
            <div className="skeleton agent-row-skeleton" />
          </div>
          <div className="agents-main">
            <div className="skeleton agent-workspace-skeleton" />
          </div>
        </div>
      ) : agents.error && !agents.data ? null : list.length === 0 && !creating ? (
        <div className="agents-empty">
          <EmptyState
            illustration="agents"
            title={t("page.emptyTitle")}
            hint={t("page.emptyHint")}
            action={createButton}
          />
        </div>
      ) : (
        <div className={cx("agents-panels", open && "agents-panels-open")}>
          <aside className="agents-list">
            <AgentList
              agents={list}
              categories={categories.data}
              selectedId={creating ? null : (selected?.id ?? null)}
              activityForId={countsFor}
              onSelect={(id) => request({ kind: "open", id })}
            />
          </aside>
          <div className="agents-main">
            {missing ? (
              <EmptyState
                illustration="missing"
                title={t("page.missingTitle")}
                hint={t("page.missingHint")}
                action={
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => request({ kind: "close" })}>
                    {t("page.back")}
                  </button>
                }
              />
            ) : creating || selected ? (
              <AgentWorkspace
                key={workspaceAgent?.id ?? NEW_AGENT}
                agent={workspaceAgent}
                categories={categories.data}
                tab={tab}
                dirty={dirty}
                toggling={toggling === workspaceAgent?.id}
                restricted={plan.restricted}
                counts={workspaceAgent ? countsFor(workspaceAgent.id) : undefined}
                activityDays={activity.data?.days}
                onTabChange={changeTab}
                onToggle={(enabled) => {
                  if (workspaceAgent) void toggle(workspaceAgent, enabled);
                }}
                onDelete={() => {
                  if (workspaceAgent) setPendingDelete(workspaceAgent);
                }}
                onBack={() => request({ kind: "close" })}
                onDirtyChange={setDirty}
                onSaved={(saved, created) => {
                  setDirty(false);
                  toast({ message: created ? t("page.created", { name: saved.name }) : t("page.saved", { name: saved.name }) });
                  write({ kind: "open", id: saved.id });
                }}
                onDiscardNew={() => commit({ kind: "close" })}
              />
            ) : (
              <EmptyState
                illustration="agents"
                title={t("page.pickTitle")}
                hint={t("page.pickHint")}
              />
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        cancelLabel={i18next.t("ui.cancel", { ns: "shell" })}
        open={pending !== null}
        title={t("page.discardTitle")}
        confirmLabel={t("page.discardConfirm")}
        onConfirm={() => {
          if (pending) commit(pending);
        }}
        onCancel={() => setPending(null)}
      >
        <p>{t("page.discardBody")}</p>
      </ConfirmDialog>

      <ConfirmDialog
        cancelLabel={i18next.t("ui.cancel", { ns: "shell" })}
        open={pendingDelete !== null}
        title={t("page.deleteTitle", { name: pendingDelete?.name ?? t("page.deleteFallbackName") })}
        confirmLabel={deleting ? t("page.deleting") : t("page.delete")}
        tone="danger"
        busy={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDelete(null)}
      >
        <p>{t("page.deleteBody")}</p>
      </ConfirmDialog>
    </div>
  );
}
