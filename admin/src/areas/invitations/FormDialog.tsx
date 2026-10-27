import { useId, type FormEvent, type ReactNode } from "react";
import { Banner } from "../../../../src/components/ui/Banner";
import { Dialog } from "../../../../src/components/ui/Dialog";

type FormDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  submitLabel: string;
  error?: string | null;
  size?: "md" | "lg";
  onSubmit: () => void;
  onClose: () => void;
  children: ReactNode;
};

export function FormDialog({ open, title, description, submitLabel, error, size = "md", onSubmit, onClose, children }: FormDialogProps) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <Dialog open={open} title={title} description={description} size={size} onClose={onClose}>
      {open ? (
        <form className="dialog-form" onSubmit={submit} noValidate>
          {error ? <Banner tone="danger">{error}</Banner> : null}
          {children}
          <div className="dialog-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              {submitLabel}
            </button>
          </div>
        </form>
      ) : null}
    </Dialog>
  );
}

type FieldProps = {
  label: string;
  help?: string;
  error?: string | null;
  children: (props: { id: string; "aria-describedby"?: string; "aria-invalid"?: true }) => ReactNode;
};

export function Field({ label, help, error, children }: FieldProps) {
  const id = useId();
  const noteId = useId();
  const note = error ?? help;
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      {children({ id, "aria-describedby": note ? noteId : undefined, "aria-invalid": error ? true : undefined })}
      {note ? (
        <span id={noteId} className={error ? "field-error" : "field-help"}>
          {note}
        </span>
      ) : null}
    </div>
  );
}

export function Summary({ rows }: { rows: readonly [string, ReactNode][] }) {
  return (
    <dl className="invitations-summary">
      {rows.map(([label, value]) => (
        <div key={label} className="invitations-summary-row">
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
