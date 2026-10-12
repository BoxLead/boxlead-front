import { useState, type FormEvent } from "react";
import type { MessageTemplate } from "../../api/types";
import { Banner } from "../../components/ui/Banner";
import { Dialog } from "../../components/ui/Dialog";
import { useApiQuery } from "../../hooks/useApiQuery";
import { emptyValues, fillTemplate, hasAllValues, templatesKey } from "./templates";
import "./TemplateDialog.css";

type TemplateDialogProps = {
  open: boolean;
  conversationId: string;
  contactName: string;
  error: string | null;
  onClose: () => void;
  onSend: (templateId: string, values: string[]) => Promise<boolean>;
};

type TemplateFormProps = {
  template: MessageTemplate;
  contactName: string;
  error: string | null;
  onBack: () => void;
  onSend: (values: string[]) => Promise<void>;
};

function readableName(template: MessageTemplate): string {
  return template.name.replace(/_/g, " ");
}

function TemplateForm({ template, contactName, error, onBack, onSend }: TemplateFormProps) {
  const [values, setValues] = useState(() => emptyValues(template));
  const [sending, setSending] = useState(false);
  const complete = hasAllValues(template, values);

  function change(index: number, value: string) {
    setValues((current) => current.map((item, position) => (position === index ? value : item)));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!complete || sending) return;
    setSending(true);
    await onSend(values.map((value) => value.trim()));
    setSending(false);
  }

  return (
    <form className="dialog-form" onSubmit={(event) => void submit(event)} noValidate>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      {values.map((value, index) => (
        <label className="field" key={index}>
          <span className="field-label">Valor {index + 1}</span>
          <input
            className="input"
            name={`value-${index + 1}`}
            value={value}
            autoComplete="off"
            required
            autoFocus={index === 0}
            onChange={(event) => change(index, event.target.value)}
          />
        </label>
      ))}
      <div className="template-preview" aria-live="polite">
        <span className="template-preview-label">Así lo va a ver {contactName}</span>
        <p className="template-preview-text">{fillTemplate(template.body, values)}</p>
      </div>
      <div className="dialog-actions">
        <button type="button" className="btn btn-secondary" onClick={onBack} disabled={sending}>
          Volver
        </button>
        <button type="submit" className="btn btn-primary" disabled={!complete || sending}>
          {sending ? "Enviando…" : "Enviar plantilla"}
        </button>
      </div>
    </form>
  );
}

type TemplatePickerProps = Omit<TemplateDialogProps, "open">;

function TemplatePicker({ conversationId, contactName, error, onClose, onSend }: TemplatePickerProps) {
  const templates = useApiQuery<MessageTemplate[]>(templatesKey(conversationId));
  const [selected, setSelected] = useState<MessageTemplate | null>(null);

  async function send(values: string[]) {
    if (!selected) return;
    const sent = await onSend(selected.id, values);
    if (sent) onClose();
  }

  if (selected) {
    return (
      <TemplateForm
        template={selected}
        contactName={contactName}
        error={error}
        onBack={() => setSelected(null)}
        onSend={send}
      />
    );
  }

  if (templates.loading) {
    return (
      <div className="template-skeleton" aria-hidden="true">
        <div className="skeleton" />
        <div className="skeleton" />
      </div>
    );
  }

  if (templates.error && !templates.data) {
    return (
      <Banner
        tone="danger"
        title="No pudimos cargar las plantillas"
        action={
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => void templates.reload()}>
            Reintentar
          </button>
        }
      >
        {templates.error}
      </Banner>
    );
  }

  if (!templates.data || templates.data.length === 0) {
    return (
      <p className="template-empty">
        Todavía no hay plantillas aprobadas que se puedan usar. Creálas y aprobalas en el administrador de WhatsApp de
        Meta y van a aparecer acá.
      </p>
    );
  }

  return (
    <ul className="template-list">
      {templates.data.map((template) => (
        <li key={template.id}>
          <button type="button" className="template-option" onClick={() => setSelected(template)}>
            <span className="template-option-name">{readableName(template)}</span>
            <span className="template-option-body">{template.body}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function TemplateDialog({ open, conversationId, contactName, error, onClose, onSend }: TemplateDialogProps) {
  return (
    <Dialog
      open={open}
      title="Responder con una plantilla"
      description="WhatsApp solo deja escribir texto libre durante las 24 horas siguientes al último mensaje de la persona."
      size="md"
      onClose={onClose}
    >
      <TemplatePicker
        conversationId={conversationId}
        contactName={contactName}
        error={error}
        onClose={onClose}
        onSend={onSend}
      />
    </Dialog>
  );
}
