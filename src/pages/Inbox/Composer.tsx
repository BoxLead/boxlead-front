import { useId, useState, type FormEvent, type KeyboardEvent } from "react";
import { SendIcon } from "../../components/icons/UiIcons";
import { CharCounter } from "../../components/ui/CharCounter";
import type { ReplyPolicy } from "../../platforms/types";

type ComposerProps = {
  policy: ReplyPolicy;
  label: string;
  onSend: (content: string) => Promise<boolean>;
};

export function Composer({ policy, label, onSend }: ComposerProps) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const hintId = useId();
  const counterId = useId();
  const content = draft.trim();
  const tooLong = policy.maxLength !== null && draft.length > policy.maxLength;
  const canSend = content.length > 0 && !tooLong && !sending;

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    if (!canSend) return;
    setSending(true);
    setDraft("");
    const ok = await onSend(content);
    if (!ok) setDraft((current) => current || content);
    setSending(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void submit();
    }
  }

  return (
    <form className="composer" onSubmit={(event) => void submit(event)}>
      <label className="visually-hidden" htmlFor={`${hintId}-input`}>
        {label}
      </label>
      <textarea
        id={`${hintId}-input`}
        className="composer-input"
        rows={1}
        placeholder={policy.placeholder}
        value={draft}
        aria-describedby={[policy.hint ? hintId : "", policy.maxLength ? counterId : ""].filter(Boolean).join(" ") || undefined}
        aria-invalid={tooLong || undefined}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
      />
      <div className="composer-bar">
        <p className={`composer-hint${policy.hint ? "" : " composer-hint-default"}`} id={hintId}>
          {policy.hint ?? "Enter para enviar, Shift + Enter para un salto de línea."}
        </p>
        {policy.maxLength ? <CharCounter id={counterId} length={draft.length} max={policy.maxLength} /> : null}
        <button
          type="submit"
          className="btn btn-primary btn-sm composer-send"
          disabled={!canSend}
          aria-label={policy.kind === "questions" ? "Responder" : "Enviar"}
        >
          <SendIcon width={16} height={16} />
          <span className="composer-send-label" aria-hidden="true">
            {policy.kind === "questions" ? "Responder" : "Enviar"}
          </span>
        </button>
      </div>
    </form>
  );
}
