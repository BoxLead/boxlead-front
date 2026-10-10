import { useState } from "react";
import { ApiError } from "../../api/client";
import type { AgentResponse, CategoryResponse } from "../../api/types";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { BotIcon } from "../../components/icons/UiIcons";
import { Banner } from "../../components/ui/Banner";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { useToast } from "../../components/ui/toast";
import { AGENTS_KEY, deleteAgent, setAgentEnabled } from "../../data/agents";
import type { PlaygroundTarget } from "../../data/agentPlayground";
import { CATEGORIES_KEY } from "../../data/categories";
import { useApiQuery } from "../../hooks/useApiQuery";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { agentErrorMessage } from "../../util/agents";
import { AgentCard } from "./AgentCard";
import { AgentDialog } from "./AgentDialog";
import { BusinessProfilePanel } from "./BusinessProfilePanel";
import { PlaygroundDialog } from "./PlaygroundDialog";
import "./Agents.css";

type Editing = { agent: AgentResponse | null; key: number };
type Testing = { name: string; target: PlaygroundTarget; key: number };

export function Agents() {
  useDocumentTitle("Agentes");

  const toast = useToast();
  const agents = useApiQuery<AgentResponse[]>(AGENTS_KEY);
  const categories = useApiQuery<CategoryResponse[]>(CATEGORIES_KEY);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [testing, setTesting] = useState<Testing | null>(null);
  const [opened, setOpened] = useState(0);
  const [toggling, setToggling] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AgentResponse | null>(null);
  const [deleting, setDeleting] = useState(false);

  const list = agents.data ?? [];

  function openEditor(agent: AgentResponse | null) {
    setOpened((count) => count + 1);
    setEditing({ agent, key: opened + 1 });
  }

  function openPlayground(name: string, target: PlaygroundTarget) {
    setOpened((count) => count + 1);
    setTesting({ name, target, key: opened + 1 });
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
    setDeleting(true);
    try {
      await deleteAgent(pendingDelete.id);
      toast({ tone: "info", message: `Eliminaste ${pendingDelete.name}.` });
      setPendingDelete(null);
    } catch (error) {
      toast({
        tone: "danger",
        message: error instanceof ApiError ? agentErrorMessage(error, "No pudimos eliminar el agente.") : "No pudimos eliminar el agente.",
      });
    } finally {
      setDeleting(false);
    }
  }

  const createButton = (
    <button type="button" className="btn btn-primary" onClick={() => openEditor(null)} disabled={!agents.data}>
      Nuevo agente
    </button>
  );

  return (
    <div className="page agents-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Agentes</h1>
          <p className="page-header-desc">
            Configurá quién responde a tus clientes, dónde trabaja cada agente y si responde solo o deja un borrador.
          </p>
        </div>
        {list.length > 0 ? createButton : null}
      </header>

      <BusinessProfilePanel />

      <section className="agents-section" aria-labelledby="agents-title">
        <h2 id="agents-title" className="agents-section-title">
          Tus agentes
        </h2>
        {categories.error && !categories.data ? (
          <Banner
            tone="danger"
            title="No pudimos cargar las categorías"
            action={
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => void categories.reload()}>
                Reintentar
              </button>
            }
          >
            {categories.error}
          </Banner>
        ) : null}
        {agents.error && !agents.data ? (
          <Banner
            tone="danger"
            title="No pudimos cargar los agentes"
            action={
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => void agents.reload()}>
                Reintentar
              </button>
            }
          >
            {agents.error}
          </Banner>
        ) : agents.loading ? (
          <div className="agent-grid" aria-hidden="true">
            {[0, 1].map((index) => (
              <div key={index} className="skeleton agent-skeleton" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="panel agents-empty">
            <EmptyState
              icon={<BotIcon />}
              title="Todavía no configuraste agentes"
              hint="Un agente responde por vos según las instrucciones y las reglas que definas."
              action={createButton}
            />
          </div>
        ) : (
          <ul className="agent-grid" aria-label="Agentes">
            {list.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                categories={categories.data}
                toggling={toggling === agent.id}
                onToggle={(enabled) => void toggle(agent, enabled)}
                onTest={() => openPlayground(agent.name, { agentId: agent.id })}
                onEdit={() => openEditor(agent)}
                onDelete={() => setPendingDelete(agent)}
              />
            ))}
          </ul>
        )}
      </section>

      {editing ? (
        <AgentDialog
          key={editing.key}
          open
          agent={editing.agent}
          categories={categories.data}
          onClose={() => setEditing(null)}
          onSaved={(saved, created) => {
            setEditing(null);
            toast({ message: created ? `Creaste ${saved.name}.` : `Guardaste ${saved.name}.` });
          }}
          onTest={(draft) => openPlayground(draft.name, { agent: draft })}
        />
      ) : null}

      {testing ? (
        <PlaygroundDialog
          key={testing.key}
          open
          agentName={testing.name}
          target={testing.target}
          categories={categories.data}
          onClose={() => setTesting(null)}
        />
      ) : null}

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
