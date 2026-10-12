import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import type { CategoryResponse, PlatformType, PlaygroundResult, SalesStage } from "../../api/types";
import { SendIcon } from "../../components/icons/UiIcons";
import { Banner } from "../../components/ui/Banner";
import { CharCounter } from "../../components/ui/CharCounter";
import { Dialog } from "../../components/ui/Dialog";
import { runPlayground, type PlaygroundTarget, type PlaygroundTurn } from "../../data/agentPlayground";
import { CONNECTABLE_PLATFORMS, stageChoices } from "../../platforms";
import { PLAYGROUND_MAX_MESSAGES, PLAYGROUND_MESSAGE_MAX, agentErrorMessage } from "../../util/agents";
import { PlaygroundResultView } from "./PlaygroundResultView";

type PlaygroundDialogProps = {
  open: boolean;
  agentName: string;
  target: PlaygroundTarget;
  categories: CategoryResponse[] | undefined;
  onClose: () => void;
};

type Entry = { id: string; turn: PlaygroundTurn };

const NO_CATEGORY = "";
const FIRST_PLATFORM: PlatformType = CONNECTABLE_PLATFORMS[0].id;

function toHistory(entries: Entry[]): PlaygroundTurn[] {
  return entries.map((entry) => entry.turn);
}

export function PlaygroundDialog({ open, agentName, target, categories, onClose }: PlaygroundDialogProps) {
  const counterId = useId();
  const inputId = useId();
  const abort = useRef<AbortController | null>(null);
  const [platform, setPlatform] = useState<PlatformType>(FIRST_PLATFORM);
  const [stage, setStage] = useState<SalesStage>("PRE_SALE");
  const [categoryId, setCategoryId] = useState(NO_CATEGORY);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [result, setResult] = useState<PlaygroundResult | null>(null);
  const [draft, setDraft] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => abort.current?.abort(), []);

  const stages = stageChoices(platform);
  const full = entries.length >= PLAYGROUND_MAX_MESSAGES;
  const tooLong = draft.length > PLAYGROUND_MESSAGE_MAX;
  const canSend = draft.trim().length > 0 && !tooLong && !running && !full;
  const saved = "agentId" in target;

  function restart() {
    abort.current?.abort();
    setEntries([]);
    setResult(null);
    setError(null);
    setRunning(false);
  }

  function changePlatform(next: PlatformType) {
    const choices = stageChoices(next);
    setPlatform(next);
    setStage(choices.some((choice) => choice.value === stage) ? stage : (choices[0]?.value ?? "PRE_SALE"));
    restart();
  }

  async function send(event?: FormEvent) {
    event?.preventDefault();
    if (!canSend) return;
    const content = draft.trim();
    const customer: Entry = { id: crypto.randomUUID(), turn: { role: "user", content } };
    const history = [...entries, customer];
    const controller = new AbortController();
    abort.current = controller;
    setEntries(history);
    setDraft("");
    setError(null);
    setRunning(true);
    try {
      const outcome = await runPlayground({
        target,
        scenario: { platform, salesStage: stage, categoryId: categoryId || null },
        history: toHistory(history),
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      setResult(outcome.result);
      if (outcome.reply) {
        setEntries((current) => [
          ...current,
          { id: crypto.randomUUID(), turn: { role: "assistant", content: outcome.reply } },
        ]);
      }
    } catch (e) {
      if (controller.signal.aborted) return;
      setEntries((current) => current.filter((entry) => entry.id !== customer.id));
      setDraft(content);
      setError(agentErrorMessage(e, "No pudimos completar la prueba. Probá de nuevo."));
    } finally {
      if (abort.current === controller) setRunning(false);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void send();
    }
  }

  return (
    <Dialog
      open={open}
      title={`Probar ${agentName}`}
      description="Escribí como si fueras un cliente. Nada se envía ni se guarda en tus conversaciones."
      size="lg"
      onClose={onClose}
    >
      <div className="playground">
        <div className="playground-scenario">
          <label className="field">
            <span className="field-label">Canal</span>
            <select
              className="select"
              value={platform}
              disabled={running}
              onChange={(event) => changePlatform(event.target.value as PlatformType)}
            >
              {CONNECTABLE_PLATFORMS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Etapa</span>
            <select
              className="select"
              value={stage}
              disabled={running}
              onChange={(event) => {
                setStage(event.target.value as SalesStage);
                restart();
              }}
            >
              {stages.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Categoría del lead</span>
            <select
              className="select"
              value={categoryId}
              disabled={running}
              onChange={(event) => {
                setCategoryId(event.target.value);
                restart();
              }}
            >
              <option value={NO_CATEGORY}>Sin categoría</option>
              {(categories ?? []).map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {entries.length === 0 && !running ? (
          <p className="playground-chat-empty">Escribí el primer mensaje del cliente para empezar.</p>
        ) : (
          <ol className="playground-chat" aria-label="Conversación de prueba" aria-live="polite">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className={`playground-turn${entry.turn.role === "assistant" ? " playground-turn-agent" : ""}`}
              >
                <span className="playground-turn-who">{entry.turn.role === "assistant" ? agentName : "Cliente"}</span>
                <span className="playground-turn-text">{entry.turn.content}</span>
              </li>
            ))}
            {running ? (
              <li className="playground-turn playground-turn-agent playground-turn-pending">
                <span className="playground-turn-who">{agentName}</span>
                <span className="playground-turn-text">Pensando…</span>
              </li>
            ) : null}
          </ol>
        )}

        {error ? (
          <Banner tone="danger" title="No se pudo hacer la prueba">
            {error}
          </Banner>
        ) : null}
        {result && !running ? <PlaygroundResultView result={result} saved={saved} /> : null}
        {full ? (
          <Banner tone="info">Llegaste al máximo de {PLAYGROUND_MAX_MESSAGES} mensajes. Reiniciá la conversación para seguir probando.</Banner>
        ) : null}

        <form className="playground-form" onSubmit={(event) => void send(event)}>
          <label className="visually-hidden" htmlFor={inputId}>
            Mensaje del cliente
          </label>
          <textarea
            id={inputId}
            className="input playground-input"
            rows={2}
            value={draft}
            placeholder="Mensaje del cliente"
            disabled={full}
            aria-invalid={tooLong || undefined}
            aria-describedby={counterId}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
          />
          <div className="playground-form-bar">
            <CharCounter id={counterId} length={draft.length} max={PLAYGROUND_MESSAGE_MAX} />
            <button type="button" className="btn btn-secondary btn-sm" onClick={restart} disabled={running || (entries.length === 0 && !error)}>
              Reiniciar
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={!canSend}>
              <SendIcon width={16} height={16} />
              <span>Enviar</span>
            </button>
          </div>
        </form>
        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </Dialog>
  );
}
