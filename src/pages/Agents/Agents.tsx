import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ApiError } from "../../api/client";
import type { AgentActivitySummary, AgentResponse, CategoryResponse } from "../../api/types";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { BotIcon } from "../../components/icons/UiIcons";
import { Banner } from "../../components/ui/Banner";
import { ChoiceGroup } from "../../components/ui/ChoiceGroup";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { useToast } from "../../components/ui/toast";
import { ACTIVITY_KEY, AGENTS_KEY, deleteAgent, setAgentEnabled } from "../../data/agents";
import { CATEGORIES_KEY } from "../../data/categories";
import { useApiQuery } from "../../hooks/useApiQuery";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { activityFor, agentErrorMessage, unassignedActivityLine, type ActivityNumbers } from "../../util/agents";
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
  useDocumentTitle("Agentes");

  const toast = useToast();
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
      toast({ tone: "info", message: enabled ? `${agent.name} está activo.` : `${agent.name} quedó en pausa.` });
    } catch (error) {
      toast({ tone: "danger", message: agentErrorMessage(error, "No pudimos cambiar el estado del agente.") });
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
      toast({ tone: "info", message: `Eliminaste ${pendingDelete.name}.` });
      setPendingDelete(null);
      if (requestedId === removedId) write({ kind: "close" });
    } catch (error) {
      setDeletedId(null);
      toast({
        tone: "danger",
        message: error instanceof ApiError ? agentErrorMessage(error, "No pudimos eliminar el agente.") : "No pudimos eliminar el agente.",
      });
    } finally {
      setDeleting(false);
    }
  }

  const failures = [
    categories.error && !categories.data
      ? { key: "categories", title: "No pudimos cargar las categorías", message: categories.error, reload: categories.reload }
      : null,
    activity.error && !activity.data
      ? { key: "activity", title: "No pudimos cargar la actividad", message: activity.error, reload: activity.reload }
      : null,
    agents.error && !agents.data
      ? { key: "agents", title: "No pudimos cargar los agentes", message: agents.error, reload: agents.reload }
      : null,
  ].filter((failure) => failure !== null);

  const createButton = (
    <button type="button" className="btn btn-primary" onClick={() => request({ kind: "open", id: NEW_AGENT })} disabled={!agents.data}>
      Nuevo agente
    </button>
  );

  const workspaceAgent = creating ? null : selected;

  return (
    <div className={cx("agents", open && "agents-open")}>
      <header className="agents-header">
        <div className="agents-heading">
          <h1 className="page-title">Agentes</h1>
          <p className="page-header-desc">
            Configurá quién responde a tus clientes, dónde trabaja cada agente y si responde solo o deja un borrador.
          </p>
          {unassigned ? <p className="agents-unassigned">{unassigned}</p> : null}
        </div>
        <div className="agents-header-actions">
          <ChoiceGroup
            label="Sección"
            variant="segmented"
            value={section}
            choices={[
              { value: "agents", label: "Agentes" },
              { value: "profile", label: "Contexto del negocio" },
            ]}
            onChange={(value) => request(value === "profile" ? { kind: "profile" } : { kind: "agents" })}
          />
          {section === "agents" && list.length > 0 ? createButton : null}
        </div>
      </header>

      {failures.length > 0 ? (
        <div className="agents-alerts">
          {failures.map((failure) => (
            <Banner
              key={failure.key}
              tone="danger"
              title={failure.title}
              action={
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => void failure.reload()}>
                  Reintentar
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
            icon={<BotIcon />}
            title="Todavía no configuraste agentes"
            hint="Un agente responde por vos según las instrucciones y las reglas que definas."
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
                icon={<BotIcon />}
                title="No encontramos este agente"
                hint="Puede que se haya eliminado."
                action={
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => request({ kind: "close" })}>
                    Volver
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
                  toast({ message: created ? `Creaste ${saved.name}.` : `Guardaste ${saved.name}.` });
                  write({ kind: "open", id: saved.id });
                }}
                onDiscardNew={() => commit({ kind: "close" })}
              />
            ) : (
              <EmptyState
                icon={<BotIcon />}
                title="Elegí un agente"
                hint="Configurá sus instrucciones, probalo o revisá qué hizo."
              />
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={pending !== null}
        title="¿Descartar los cambios?"
        confirmLabel="Descartar"
        onConfirm={() => {
          if (pending) commit(pending);
        }}
        onCancel={() => setPending(null)}
      >
        <p>Los cambios de este agente no se guardaron.</p>
      </ConfirmDialog>

      <ConfirmDialog
        open={pendingDelete !== null}
        title={`¿Eliminar ${pendingDelete?.name ?? "el agente"}?`}
        confirmLabel={deleting ? "Eliminando…" : "Eliminar"}
        tone="danger"
        busy={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDelete(null)}
      >
        <p>Deja de responder en las conversaciones donde trabajaba. Esto no se puede deshacer.</p>
      </ConfirmDialog>
    </div>
  );
}
