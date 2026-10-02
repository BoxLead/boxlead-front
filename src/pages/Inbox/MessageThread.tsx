import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { api, ApiError } from "../../api/client";
import type {
  ConversationResponse,
  CreateMessageRequest,
  LeadResponse,
  MessageResponse,
} from "../../api/types";
import { SendIcon } from "../../components/icons/UiIcons";
import { useApiQuery } from "../../hooks/useApiQuery";
import { formatShortDate } from "../../util/format";
import { ThreadPane } from "./ThreadPane";
import "./MessageThread.css";

type MessageThreadProps = {
  conversation: ConversationResponse;
  lead: LeadResponse | undefined;
  onBack: () => void;
  onSent: () => void;
};

export function MessageThread({
  conversation,
  lead,
  onBack,
  onSent,
}: MessageThreadProps) {
  const path = `/conversations/${conversation.id}/messages`;
  const { data, error, loading, reload } = useApiQuery<MessageResponse[]>(path);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messages = data ?? [];

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [data]);

  async function send() {
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    setSendError(null);
    try {
      const body: CreateMessageRequest = { direction: "OUTBOUND", content };
      await api.post<MessageResponse>(path, body);
      setDraft("");
      reload();
      onSent();
    } catch (e) {
      setSendError(
        e instanceof ApiError ? e.message : "No pudimos enviar el mensaje.",
      );
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void send();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send();
    }
  }

  return (
    <ThreadPane
      lead={lead}
      platform={conversation.platform}
      onBack={onBack}
      footer={
        <form className="message-compose" onSubmit={handleSubmit}>
          <label className="visually-hidden" htmlFor="reply-input">
            Tu respuesta
          </label>
          <textarea
            id="reply-input"
            className="message-compose-input"
            rows={1}
            placeholder="Escribí una respuesta…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
          />
          <button
            type="submit"
            className="btn btn-primary message-compose-send"
            disabled={sending || !draft.trim()}
          >
            <SendIcon width={18} height={18} />
            <span>{sending ? "Enviando…" : "Enviar"}</span>
          </button>
        </form>
      }
    >
      <div className="thread-scroll" ref={scrollRef}>
        {loading ? <p className="thread-status">Cargando mensajes…</p> : null}
        {(error ?? sendError) ? (
          <p className="thread-status thread-error" role="alert">
            {error ?? sendError}
          </p>
        ) : null}
        {!loading && !error && messages.length === 0 ? (
          <p className="thread-status">Todavía no hay mensajes.</p>
        ) : null}
        <ul className="bubble-list" aria-live="polite">
          {messages.map((message) => (
            <li
              key={message.id}
              className={`bubble${message.direction === "OUTBOUND" ? " bubble-outbound" : ""}`}
            >
              <div className="bubble-content">
                {message.content?.trim() || (
                  <em className="bubble-empty">(sin texto)</em>
                )}
              </div>
              <time className="bubble-time" dateTime={message.createdAt}>
                {formatShortDate(message.createdAt)}
              </time>
            </li>
          ))}
        </ul>
      </div>
    </ThreadPane>
  );
}
